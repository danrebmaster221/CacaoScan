# API & Communication Specification - CacaoScan

## 1. WebSocket Protocol (Local Network)
- **Host**: Node.js Edge Server (assigned static IP)
- **Port**: 8080
- **Client**: ESP32-S3

### 1.1 Hardware to Server (UPLINK)
Every time a bean is classified, the ESP32 sends this JSON:
{
  "event": "classification_result",
  "machine_id": "UNIT_01",
  "batch_id": "UUID",
  "data": {
    "variety": "Criollo | Forastero | Trinitario",
    "quality": "Export | Needs_Drying | Rejected",
    "confidence": 0.00,
    "image_url": "cloudinary_link"
  }
}

### 1.2 Server to Hardware (DOWNLINK)
Used for remote calibration and Emergency Stop:
{
  "command": "SET_CONFIG | E_STOP | START_BATCH",
  "payload": {
    "belt_speed": 20.0,
    "gate_pulse": 300
  }
}

## 2. Supabase Integration (Cloud Sync)
- **Table References**: Matches [[SCHEMA.md]]
- **Auth**: Handled via Node.js service account (service_role key).