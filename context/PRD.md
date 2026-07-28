# Product Requirements Document (PRD) - CacaoScan

This PRD establishes the absolute boundaries of the CacaoScan project, maintaining focus on the core objective: building an optimized Local Edge AI cacao bean sorting system. Do not reference chronological build phases or delivery timeframes, as this document is written to inform AI and human developers purely on structural scopes.

## 1. Project Scope
**In Scope:**
- A physical mechanism (ESP32-S3 + sensors + actuators) to capture bean imagery and actuate physical routing gates based on AI decisions.
- A Local Edge AI Server running a single YOLOv8n TFLite INT8 model predicting 5 classes (Criollo, Forastero, Trinitario, Needs Drying, Rejected).
- Real-time cloud persistence via Supabase PostgreSQL.
- Two distinct client interfaces: a React Native mobile application tailored for on-site farm operators and a React JS / Vite web dashboard for regional managers.

**Out of Scope (Current Version):**
- Cloud-based inference (strict requirement to avoid cloud latency).
- Dual-model computer vision architectures.
- External marketplace integrations or payment gateways.

## 2. Minimum Viable Product (MVP)
The bare-minimum features required for launch:
1. **Continuous Single-File Pipeline:** Rapid O(n) image capture and delayed hardware gating without stopping the conveyor.
2. **Local AI Hub:** Edge workstation achieving <800ms total inference + routing decision time.
3. **Operator Control:** Mobile app interface allowing farmers to register machines, initiate batches, and trigger manual overrides (Emergency Stop).
4. **Audit & Traceability:** Logging of every classified bean and automatic digital certification upon batch completion.

## 3. Core Goals
- **Empower Farmers:** Automate the highly tedious manual sorting process of fermented cacao beans, guaranteeing export-grade quality consistency.
- **Eliminate Latency:** Transition away from internet-dependent API calls (e.g., Hugging Face) using exclusively Edge MLOps.
- **Secure Management:** Uphold strict ISO 27001-aligned access controls (RLS policies, audit logs) for regional managers.

## 4. Technical Requirements
- **Hardware/Firmware:** ESP32-S3 (C++), Infrared Sensors, SG90 PWM Servo Motors.
- **Edge Server:** Node.js WebSocket Server, Python FastAPI, YOLOv8n (OpenCV/PyTorch).
- **Backend/Database:** Supabase (PostgreSQL), Supabase Auth, Cloudinary (for archived datasets).
- **Frontend Clients:** React Native (Expo) (Mobile), React JS (Vite + Tailwind CSS) (Web).

### 4.2 Static Memory Allocation Safeguard (TFLite Micro)
- **Tensor Arena Allocation:** The TFLite Micro runtime on the ESP32-S3 utilizes a strictly defined, pre-allocated static memory arena of 4MB.
- **Heap Protection:** All memory allocations for the neural network are declared globally at system bootup. The AI is prevented from dynamically requesting memory during operations, eliminating the risk of memory leaks, heap fragmentation, or Out-Of-Memory (OOM) crashes during continuous, multi-hour operations.

## 5. Success Metrics
- **Sorting Accuracy:** >95% validation precision against expert grading.
- **Throughput Speed:** Capable of processing at a linear-time O(n) rate without stalling mechanisms.
- **Uptime/Reliability:** 99.9% local server availability regardless of farm Wi-Fi degradation.

## 6. AI-Assisted Optimization (Feature Ideation Guidelines)
When expanding on this PRD via AI Coder ideation:
- Evaluate every suggested feature purely against the metric of "Does this optimize local throughput speed or data security?"
- Decline overly complex abstractions (e.g., GraphQL migrations or Kafka event-streaming) in favor of the existing Supabase REST/Realtime ecosystem to maintain the simplicity of the MVP.
