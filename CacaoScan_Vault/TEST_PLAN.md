# Project Validation & Test Plan

## 1. Performance Benchmarks
- **Throughput**: 70 beans in 120 seconds.
- **AI Latency**: < 200ms per bean (TFLite INT8).
- **Success Rate**: 95% mechanical ejection accuracy.

## 2. Validation Layers
- **Layer 1 (Logic)**: Serial Monitor logs "ENTRY" and "EXIT" for every bean.
- **Layer 2 (AI)**: Confusion Matrix comparing machine result vs. Expert grading.
- **Layer 3 (Network)**: Data persistence check in Supabase after 50-bean batch.

## 3. Stress Test Conditions
- 100% full hopper (checking for jams).
- Variable ambient light (checking Vision Tunnel isolation).
- Rapid fire (beans spaced only 1.5s apart).