# 🛠️ CacaoScan Hardware Pinout (V1.0)

## 1. Microcontroller: ESP32-S3 N16R8
| Function | Pin (GPIO) | Type | Notes |
| :--- | :--- | :--- | :--- |
| **Entry IR Sensor** | GPIO 1 | Input (Pullup) | Trigger for AI Scan |
| **Exit IR Sensor** | GPIO 2 | Input (Pullup) | Exit/Audit Verification |
| **Hopper Gate** | GPIO 4 | PWM (Output) | MG996R Servo (Metering) |
| **Rejected Bin** | GPIO 18 | PWM (Output) | SG90 Servo (Gate 1) |
| **Needs Drying** | GPIO 17 | PWM (Output) | SG90 Servo (Gate 2) |
| **Criollo Bin** | GPIO 16 | PWM (Output) | SG90 Servo (Gate 3) |
| **Forastero Bin** | GPIO 15 | PWM (Output) | SG90 Servo (Gate 4) |
| **Trinitario Bin** | GPIO 7 | PWM (Output) | SG90 Servo (Gate 5) |
| **Vibrator Motor** | N/A | 12V Direct | Connected to IN side of Buck |

## 2. Power Infrastructure
- **Main Power**: Allan 12V 5A DC Adapter.
- **Buck Converter**: LM2596 (Output set to **5.0V**).
- **Stabilization**: 1000uF 16V Capacitor across the 5V Servo Rail.
- **Rail Separation**:
    - **Bottom Board**: 5V (Muscles: Servos/Relays).
    - **Top Board**: 3.3V (Logic: IR Sensors).
- **Common Ground**: All negative rails bridged to ESP32 GND.

## 3. Vision System
- **Camera**: OV3660 3MP USB Module.
- **Connection**: USB-C OTG Hub -> ESP32-S3 Native USB Port.
- **Focus**: Manual Calibration at 15cm distance.