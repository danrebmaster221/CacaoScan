# Milestone 3 — Physical Machine Identity Review

## 1. Files changed

- `firmware/models/ver_1/CacaoScan_AI.ino`
- `Cacao_Server/edge_server.py`

## 2. git diff --stat

```
 Cacao_Server/edge_server.py            | 21 +++++++++++++++++++--
 firmware/models/ver_1/CacaoScan_AI.ino |  8 +++++---
 2 files changed, 24 insertions(+), 5 deletions(-)
```

That stat is the full working-tree diff versus HEAD. It also includes older uncommitted edits in those same files: the firmware default server IP `192.168.1.11` to `192.168.1.70`, and the edge camera index `0` to `1`. Those are not Milestone 3 identity changes. The identity hunks are in the sections below.

## 3. firmware/models/ver_1/CacaoScan_AI.ino

```diff
 const int SERVER_PORT = 5000;
+const char MACHINE_ID[] = "CS-0001";
 unsigned long lastEntryTrigger = 0;
```

```diff
     Serial.printf("  CACAOSCAN ARMED & READY: http://%s:%d\n", server_ip, SERVER_PORT);
+    Serial.printf("  MACHINE ID: %s\n", MACHINE_ID);
     Serial.println("  Wave hand or bean across IR Sensor 1 to trigger ");
```

```diff
-    String url = "http://" + String(server_ip) + ":" + String(SERVER_PORT) + "/trigger";
+    String url = "http://" + String(server_ip) + ":" + String(SERVER_PORT) + "/trigger?machine_id=" + MACHINE_ID;
```

Milestone 3 did not change GPIO mappings, IR logic, servo/gate logic, conveyor relay logic, timing/delays, Wi-Fi configuration behavior, HTTP timeout, or classification-to-gate mapping.

## 4. Cacao_Server/edge_server.py

The required environment check is before the camera and model imports:

```diff
+import os
+import sys
 import time
 import threading
+
+MACHINE_ID = os.environ.get("CACAO_MACHINE_ID", "").strip()
+if not MACHINE_ID:
+    print("[CONFIG] CACAO_MACHINE_ID is required. Set it before starting the edge server.", file=sys.stderr)
+    raise SystemExit(1)
+
 import cv2
-from flask import Flask, Response
+from flask import Flask, Response, request
 from ultralytics import YOLO

 app = Flask(__name__)

 print("[INIT] Loading CacaoScan AI Brain (best.pt)...")
 model = YOLO('best.pt')
```

```diff
+@app.route('/health', methods=['GET'])
+def health():
+    return MACHINE_ID, 200
+
 @app.route('/trigger', methods=['GET'])
 def trigger_ai():
     global current_classification
+    requested_id = (request.args.get("machine_id") or "").strip()
+    if requested_id != MACHINE_ID:
+        return "machine_id mismatch", 403
     print(f"\n[SIGNAL] ESP32 Scan Request -> Returning: {current_classification}")
     return current_classification
```

Milestone 3 did not change the YOLO model configuration, the confidence threshold, `/video_feed`, or the inference logic. The working-tree diff versus HEAD also changes `VideoCapture(0)` to `VideoCapture(1)` via `CAMERA_INDEX`. That camera-index edit predates this milestone.

## 5. Secret scan

A search of the changed firmware and edge-server files found no `master_pin`, `service_role`, `SUPABASE`, `password`, `anon_key`, or `VERIFY_MACHINE_PIN`. Milestone 3 did not introduce a credential.

## 6. Local verification summary

- Startup without `CACAO_MACHINE_ID`: exit code 1, `[CONFIG] CACAO_MACHINE_ID is required`, before the model loaded.
- `/health` with `CACAO_MACHINE_ID=CS-0001`: `CS-0001`, HTTP 200.
- Matching `/trigger?machine_id=CS-0001`: `EMPTY`, HTTP 200.
- Missing `machine_id`: `machine_id mismatch`, HTTP 403.
- Mismatched `machine_id=OTHER`: `machine_id mismatch`, HTTP 403.
