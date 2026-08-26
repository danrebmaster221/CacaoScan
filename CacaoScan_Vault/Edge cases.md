Edge cases

**1\. What is the difference between ESP32 and ESP32-S3?**

The ESP32-S3 is not just a minor upgrade to the classic ESP32; it was redesigned specifically for **Edge AI and Machine Learning**.

| **Feature**              | **Classic ESP32**              | **ESP32-S3**                   | **Why it matters for CacaoScan**                                                                                                                  |
| ------------------------ | ------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Processor**            | Dual-core Xtensa LX6 (240 MHz) | Dual-core Xtensa LX7 (240 MHz) | The LX7 architecture is much more efficient at executing instructions per clock cycle.                                                            |
| **AI Vector Extensions** | **None**                       | **Yes (Custom Instructions)**  | The S3 has built-in hardware acceleration for **matrix multiplication** (the core math of YOLO). This makes AI math **3x to 5x faster** \[1, 2\]. |
| **RAM (PSRAM) Speed**    | Quad SPI (Slower)              | **Octal SPI (Much Faster)**    | Moving image frames from the camera to memory is incredibly fast, preventing lag.                                                                 |
| **USB Support**          | Requires external USB chip     | **Native USB OTG**             | Allows the S3 to communicate directly with high-speed USB cameras or laptops.                                                                     |

**2\. Why ESP32-S3? (Why not classic ESP32 or Raspberry Pi?)**

**Why not the Classic ESP32?**

The classic ESP32 simply **cannot handle local YOLOv8n inference**.

- Without AI vector instructions, running a quantized YOLO model on a classic ESP32 would take **2 to 4 seconds per bean**.
- The classic ESP32 lacks the high-speed Octal PSRAM needed to store the 3.5MB model while holding a high-resolution camera frame in memory. It would crash due to "Out of Memory" (OOM) errors.

**Why not a Raspberry Pi?**

While a Raspberry Pi (Pi 4 or Pi 5) is incredibly fast and has no trouble running YOLOv8, it has major drawbacks for a cooperative-scale agricultural machine:

- **Operating System Overhead:** A Raspberry Pi runs a full Linux OS. If a farmer abruptly pulls the plug to turn off the machine, the SD card can easily get **corrupted**, ruining your system. The ESP32-S3 runs bare-metal C++ code-it boots instantly (under 100ms) and can be powered off abruptly without any risk of corruption.
- **Cost & Power:** A Raspberry Pi costs around ₱3,500-₱6,000 and consumes 15W of power (requiring active fan cooling). The ESP32-S3 costs around ₱450, consumes less than 1W, and runs completely silent without a fan.
- **Complexity:** For a single-stream conveyor, a Raspberry Pi is expensive overkill.

**3\. Can the ESP32-S3 handle it? (And how to manage "Edge Cases")**

Yes, the ESP32-S3 can easily handle this workload, **but only if the software is designed correctly**. Since you mentioned preparing for edge cases, here are the exact real-world engineering challenges you will face and how to solve them:

**Edge Case A: "Thread Blocking" (Will the motor or servo fail while the AI is thinking?)**

- _The Risk:_ If the ESP32-S3 is 100% busy running the YOLOv8n math, it might "miss" the timing to open the gate or read the IR sensor.
- _The Solution (Dual-Core Processing):_ The ESP32-S3 is **Dual-Core**. You must write your code to run **Multithreading**:
  - **Core 0 (The Real-Time Worker):** Dedicated strictly to the conveyor motor, reading IR sensors, and executing the servo timing.
  - **Core 1 (The Thinker):** Dedicated strictly to running the TFLite INT8 model.
  - _Result:_ No matter how hard Core 1 is thinking, Core 0 will never miss a timing window.

**Edge Case B: "Memory Leaks" (Will the machine crash after running for 2 hours?)**

- _The Risk:_ Continuous image capture and classification can cause memory fragmentation, leading to a crash mid-operation.
- _The Solution (Static Allocation):_ When using **TensorFlow Lite Micro**, you define a fixed memory "arena" (e.g., 4MB) at bootup. The AI is forced to work _only_ inside that pre-allocated box. It cannot request more memory dynamically, making it mathematically impossible to have a memory leak or crash from continuous use.

**Edge Case C: "Thermal Throttling" (Will the chip overheat?)**

- _The Risk:_ Running continuous matrix calculations at 240 MHz will make the tiny ESP32-S3 hot.
- _The Solution:_ Buy a tiny, cheap aluminum heatsink (₱15) and stick it on top of the ESP32-S3 metal shield inside your control box.

**Edge Case D: "Back-to-Back Beans" (What if two beans are too close together?)**

- _The Risk:_ If two beans pass the camera within 200ms of each other, the AI won't finish processing Bean #1 before Bean #2 needs to be scanned.
- _The Solution:_
  - Your **MG996R gate** at the hopper must physically enforce a delay (e.g., releasing a bean only once every 1.5 seconds) [1.5].
  - Implement a **Queue (FIFO)** structure in your code. Core 1 pushes the sorting decision to a queue, and Core 0 reads from that queue to trigger the servos at the correct timestamp.

**Edge Case E: "Ambient Light Fluctuations" (Variable AI Accuracy)**
- *The Risk:* Farms are semi-outdoor environments. Changing sunlight (morning vs. afternoon, cloudy vs. bright sun) drastically alters shadows and colors on the belt. If the camera uses automatic white balance or if external light leaks into the scanning area, your YOLOv8n model will suffer from false positives (e.g., normal shadows being misclassified as mold) [10].
- *The Solution:*
  - **Physical:** Build the enclosed, light-isolated Vision Tunnel to completely block out ambient sunlight [10].
  - **Software:** Program the camera firmware to lock the exposure, gain, and white balance to static/manual values, relying 100% on the consistent internal LED ring light [10].

**Edge Case F: "Mechanical Vibration & Dust" (Blurry Images / Lens Degradation)**
- *The Risk:* Dried cacao beans produce fine dust and shell fragments. The vibratory hopper also shakes the entire physical frame. Dust settling on the camera lens, combined with frame vibrations, will cause blurry images, drastically reducing model accuracy.
- *The Solution:*
  - **Dampening:** Place soft rubber mounts (vibration isolators) between the vibrating hopper and the main conveyor frame to mechanically decouple them.
  - **Air/Glass Protection:** Place a clean, transparent acrylic shield over the camera lens that can be easily wiped clean by the operators during maintenance.

**Edge Case G: "Physical Bean Slippage" (Timing Synchronization Error)**
- *The Risk:* Your timing algorithm (Time = Distance / Belt Velocity) assumes the bean moves at the exact same speed as the belt [21]. However, if the conveyor belt is too shiny or smooth, a dropped bean may slide, bounce, or slip upon landing. It will arrive at the servo gate later than the calculated timestamp, causing the paddle to miss the bean.
- *The Solution:*
  - **Belt Texture:** Use a rough-textured, matte-finish PVC belt with a high-friction coefficient so the bean "grips" the surface instantly upon drop.
  - **Ramp angle:** Design the V-guide to smoothly transition the bean onto the belt in the direction of the belt's motion, minimizing bounce.

**Edge Case H: "Ghost Triggers" (IR Sensor Noise)**
- *The Risk:* Flyaway dust, falling debris, or insects passing in front of the IR trigger sensor can break the beam. This sends a "ghost trigger" to the ESP32, which will capture a photo of an empty belt, wasting CPU cycles running inference on nothing [21].
- *The Solution (Software De-bouncing):* Implement a temporal filter in your C++ firmware on Core 0. The IR beam must remain broken for at least 30 milliseconds (the average time it takes for a real cacao bean to pass through) before the ESP32 registers a valid bean trigger. Any interrupt shorter than 30ms is ignored as noise.

**Edge Case I: "Local Network Dropout"**
- *The Risk:* If the Wi-Fi connection between the ESP32-S3 and the Local Node.js server fails, the sorting results cannot be sent to Supabase.
- *The Solution (Internal Flash Spooling):* The ESP32-S3's 16MB Flash (configured in your IDE) will store up to 500 classification records in a local SPIFFS/LittleFS queue. Once the connection is restored, the ESP32 "pushes" the queued data to the server asynchronously. Sorting continues without interruption.