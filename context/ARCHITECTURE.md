# System Architecture (ARCHITECTURE) - CacaoScan

This document serves as the high-level mapping of CacaoScan. It actively enforces the shift away from cloud-dependent processing, asserting the boundaries of the Local Edge AI pipeline.

## 1. Top-Level System Overview
The architecture is divided into three interconnected, yet highly decoupled zones:
1. **IoT Hardware Zone (Physical):** Conveyor, ESP32-S3, IR Sensors, SG90 Gate Servos, IP Camera.
2. **Edge Zone (Local Intranet):** Node.js Socket Manager + FastAPI YOLOv8 Instance. Performs intense computation locally without internet.
3. **Cloud/Client Zone (Internet):** Supabase (DB + Auth), Cloudinary (Dataset Archive), React Native App, Web Dashboard.

## 2. Design Methodology
**Local Edge-Gateway Architecture:** 
The system relies on localized decision-making. The Edge Server acts as the central brain formatting hardware protocols (I2C/Serial/WebSockets) into secure Cloud Sync HTTP payloads asynchronously. The physical sorting operation *never* awaits a cloud response.

## 3. Design Patterns
- **Asynchronous Loop Pattern:** Firmware operates non-blocking; the conveyor continues running while HTTP calls fire asynchronously to the Edge model.
- **Repository Pattern (Frontend):** All Supabase queries in mobile/web are abstracted into distinct service files (e.g., `services/supabase.ts`), ensuring UI components do not handle raw DB logic.
- **State Machine (Firmware):** The ESP32 is loosely mapped as a strict state machine (`IDLE`, `BATCH_ACTIVE`, `E_STOP`).

## 4. Data Flow (Continuous Pipeline)
1. **Start:** Farmer initializes batch on Mobile App -> Supabase saves `tblbatches` -> Local Server pulls batch state.
2. **Execution:** Conveyor runs. IR Sensor interrupt fires when bean passes -> ESP32 requests IP Camera snapshot -> HTTP POST to Local AI.
3. **Inference:** YOLOv8 local classification.
4. **Calculated Discharge:** Physical distance from Camera to Bin is known. Edge/ESP calculates Time Delay (Distance / Belt Velocity). 
5. **Actuation:** Hardware timer counts down -> Servo actuates -> bean falls into distinct bin.
6. **Reporting:** Edge Server syncs inference telemetry to Supabase. Mobile app pulls live stats.

### 4.2 Pipelined Ejection Queue (FIFO)
Because the conveyor belt remains in continuous motion, the system utilizes a First-In, First-Out (FIFO) timing queue to track multiple beans "in-flight":
1. When IR Sensor 1 triggers a camera capture, a timestamp (T_trigger) is recorded.
2. The AI identifies the bean's class.
3. The system calculates the physical arrival time at the target bin: T_target = T_trigger + (Distance / Velocity).
4. This event is pushed to a hardware timer queue on Core 0.
5. Core 0 continuously polls the queue; when the system clock matches T_target, the corresponding SG90 deflector paddle is actuated, allowing parallel, collision-free sorting of consecutive beans.

## 5. Key Implementations
- **OAuth Deep Linking:** React Native handles Google SSO natively utilizing `expo-auth-session` and `expo-linking` for secure isolated environments.
- **Physical Timing Algorithm:** 
  ```python
  def calculate_gate_delay(belt_speed_cm_s, bin_distance_cm, inference_time_s):
      mechanical_travel_time = bin_distance_cm / belt_speed_cm_s
      target_delay = mechanical_travel_time - inference_time_s
      return max(target_delay, 0)
  ```

### 5.2 Dual-Core Task Allocation (Thread Safety)
To prevent inference latency from blocking real-time hardware operations, tasks are strictly divided across the ESP32-S3's dual Xtensa LX7 cores:
- **Core 0 (Real-Time Control Thread):** Handles all hardware interrupts, reads IR sensor triggers, maintains conveyor belt speed, and executes servo PWM timing.
- **Core 1 (AI Inference Thread):** Runs the local TFLite INT8 model. Once an image is captured, Core 1 executes inference and pushes the output class to a shared, thread-safe FIFO Queue. Core 0 pops from this queue to schedule gate actuation.
