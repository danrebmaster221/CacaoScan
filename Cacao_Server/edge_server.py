"""
============================================================================
CacaoScan Edge AI Server - Multi-Bean Real-Time Bounding Box HUD
============================================================================
"""

import time
import threading
import cv2
from flask import Flask, Response
from ultralytics import YOLO

app = Flask(__name__)

print("[INIT] Loading CacaoScan AI Brain (best.pt)...")
model = YOLO('best.pt')

cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 640)
cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

latest_raw_frame = None
latest_display_frame = None
frame_lock = threading.Lock()
current_classification = "EMPTY"

@app.route('/trigger', methods=['GET'])
def trigger_ai():
    global current_classification
    print(f"\n[SIGNAL] ESP32 Scan Request -> Returning: {current_classification}")
    return current_classification

def generate_mjpeg():
    while True:
        with frame_lock:
            if latest_display_frame is None:
                time.sleep(0.03)
                continue
            ret, jpeg = cv2.imencode('.jpg', latest_display_frame)
        if ret:
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
        time.sleep(0.04)

@app.route('/video_feed', methods=['GET'])
def video_feed():
    return Response(generate_mjpeg(), mimetype='multipart/x-mixed-replace; boundary=frame')

def start_flask():
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True, use_reloader=False)

threading.Thread(target=start_flask, daemon=True).start()

cv2.namedWindow("CacaoScan - Multi-Bean Vision Feed", cv2.WINDOW_AUTOSIZE)

while True:
    ret, frame = cap.read()
    if not ret:
        time.sleep(0.05)
        continue

    with frame_lock:
        latest_raw_frame = frame.copy()

    # Run YOLOv8 detection on the live frame
    results = model.predict(frame, imgsz=640, conf=0.40, verbose=False)[0]
    display_frame = frame.copy()

    detected_labels = []

    # Draw bounding boxes for EVERY detected bean
    for box in results.boxes:
        cls_id = int(box.cls[0].item())
        label_name = results.names[cls_id]
        conf = float(box.conf[0].item())
        detected_labels.append(label_name)

        # Coordinates
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

        # Colors: Red for Rejected, Yellow for Drying, Green for Varieties
        if label_name == "Rejected":
            color = (0, 0, 255)
        elif label_name == "Needs_Drying":
            color = (0, 255, 255)
        else:
            color = (0, 255, 0)

        # Draw Bounding Box around the bean
        cv2.rectangle(display_frame, (x1, y1), (x2, y2), color, 2)

        # Draw Label Tag with confidence
        tag = f"{label_name} {conf*100:.1f}%"
        (w_text, h_text), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        cv2.rectangle(display_frame, (x1, y1 - 20), (x1 + w_text + 4, y1), color, -1)
        cv2.putText(display_frame, tag, (x1 + 2, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA)

    # Determine overall decision for ESP32 (Quality-First)
    if "Rejected" in detected_labels:
        current_classification = "Rejected"
    elif "Needs_Drying" in detected_labels:
        current_classification = "Needs_Drying"
    elif len(detected_labels) > 0:
        current_classification = detected_labels[0]
    else:
        current_classification = "EMPTY"

    # Status Banner
    cv2.putText(display_frame, f"LIVE DETECTIONS: {len(results.boxes)} BEANS | SORT: {current_classification}",
                (15, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

    with frame_lock:
        latest_display_frame = display_frame.copy()

    cv2.imshow("CacaoScan - Multi-Bean Vision Feed", display_frame)
    if (cv2.waitKey(1) & 0xFF) == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()