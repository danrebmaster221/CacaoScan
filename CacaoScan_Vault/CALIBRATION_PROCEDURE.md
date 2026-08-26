# Physical Calibration & Timing Math

## 1. Constants
- **Total Belt Length**: 55cm (Roller center-to-center).
- **Belt Velocity (V)**: Target 20cm/s (Adjustable in [[SCHEMA.md]]).
- **Trigger Point (T=0)**: IR Sensor 1 / Camera Zone (15cm mark).

## 2. Timing Algorithm (The O(n) Logic)
To hit the bean while the belt is moving, the AI must calculate the "Wait Time" (Tw):
`Tw = (Distance_to_Gate / V) - Inference_Latency`

### 2.1 Gate Offsets (from T=0)
- **Gate 1 (Rejected)**: 15cm from trigger -> Delay = (15 / V).
- **Gate 2 (Drying)**: 21cm from trigger -> Delay = (21 / V).
- **Gate 3 (Criollo)**: 27cm from trigger -> Delay = (27 / V).
- **Gate 4 (Forastero)**: 33cm from trigger -> Delay = (33 / V).
- **Gate 5 (Trinitario)**: 39cm from trigger -> Delay = (39 / V).

## 3. Servo Angles
- **Neutral (Paddles tucked)**: 0 degrees.
- **Ejection (Paddle extended)**: 90 degrees.
- **Pulse Duration**: 300ms (Time the paddle stays out).