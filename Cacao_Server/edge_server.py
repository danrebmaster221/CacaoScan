"""
============================================================================
CacaoScan Edge AI Server - Multi-Bean Real-Time Bounding Box HUD
============================================================================
"""

import atexit
import ipaddress
import os
import secrets
import socket
import sys
import time
import threading

MACHINE_ID = os.environ.get("CACAO_MACHINE_ID", "").strip()
if not MACHINE_ID:
    print("[CONFIG] CACAO_MACHINE_ID is required. Set it before starting the edge server.", file=sys.stderr)
    raise SystemExit(1)

def normalize_machine_id(machine_id: str) -> str:
    chars = []
    prev_hyphen = False
    for ch in machine_id.strip().lower():
        if ch in " \t":
            continue
        if not (ch.isalnum() or ch == "-"):
            ch = "-"
        if ch == "-" and (prev_hyphen or not chars):
            continue
        prev_hyphen = ch == "-"
        chars.append(ch)
    return "".join(chars).strip("-")

def edge_hostname(machine_id: str) -> str:
    return f"cacaoscan-{normalize_machine_id(machine_id)}.local"

def _ipv4_reject_reason(ip_text: str):
    try:
        addr = ipaddress.ip_address(ip_text)
    except ValueError:
        return "not an IPv4 address"
    if addr.version != 4 or addr.is_unspecified:
        return "unspecified"
    if addr.is_loopback:
        return "loopback"
    if addr.is_link_local:
        return "link-local"
    if not addr.is_private:
        return "not a private LAN address"
    return None

def _lan_rank(ip_text: str) -> int:
    addr = ipaddress.ip_address(ip_text)
    if addr in ipaddress.ip_network("192.168.0.0/16"):
        return 0
    if addr in ipaddress.ip_network("10.0.0.0/8"):
        return 1
    if addr in ipaddress.ip_network("172.16.0.0/12"):
        return 2
    return 9

def local_ipv4_addresses():
    found = []
    seen = set()
    names = []
    try:
        names.append(socket.gethostname())
    except OSError as exc:
        print(f"[MDNS] skipped hostname lookup: {exc}")
    try:
        fqdn = socket.getfqdn()
        if fqdn not in names:
            names.append(fqdn)
    except OSError as exc:
        print(f"[MDNS] skipped FQDN lookup: {exc}")
    for name in names:
        try:
            infos = socket.getaddrinfo(name, None, socket.AF_INET)
        except OSError as exc:
            print(f"[MDNS] skipped name lookup {name}: {exc}")
            continue
        for info in infos:
            ip_text = info[4][0]
            if ip_text in seen:
                continue
            seen.add(ip_text)
            found.append(ip_text)
    return found

def choose_advertise_ip():
    override = os.environ.get("CACAO_ADVERTISE_IP", "").strip()
    skipped = []
    usable = []
    for ip_text in local_ipv4_addresses():
        reason = _ipv4_reject_reason(ip_text)
        if reason:
            skipped.append((ip_text, reason))
        else:
            usable.append(ip_text)
    usable.sort(key=_lan_rank)
    for ip_text, reason in skipped:
        print(f"[MDNS] skipped adapter {ip_text} ({reason})")
    if override:
        reason = _ipv4_reject_reason(override)
        if reason:
            print(f"[MDNS] CACAO_ADVERTISE_IP={override} rejected ({reason}). Advertisement skipped.")
            return None
        print(f"[MDNS] CACAO_ADVERTISE_IP override in use: {override}")
        return override
    if not usable:
        print("[MDNS] No suitable LAN IPv4. Advertisement skipped.")
        return None
    print(f"[MDNS] Selected LAN IPv4: {usable[0]}")
    return usable[0]

_zeroconf = None
_mdns_service = None

def stop_mdns_advertisement():
    global _zeroconf, _mdns_service
    zc = _zeroconf
    info = _mdns_service
    _zeroconf = None
    _mdns_service = None
    if zc is None:
        return
    try:
        if info is not None:
            zc.unregister_service(info)
            print("[MDNS] Advertisement removed")
    except Exception as exc:
        print(f"[MDNS] Unregister failed: {exc}")
    try:
        zc.close()
    except Exception as exc:
        print(f"[MDNS] Zeroconf close failed: {exc}")

def start_mdns_advertisement():
    global _zeroconf, _mdns_service
    hostname = edge_hostname(MACHINE_ID)
    print(f"[MDNS] Derived hostname: {hostname}")
    ip_text = choose_advertise_ip()
    if not ip_text:
        return
    try:
        from zeroconf import IPVersion, ServiceInfo, Zeroconf
    except ImportError:
        print("[MDNS] zeroconf is not installed. Install it with: python -m pip install zeroconf")
        return
    label = hostname[: -len(".local")] if hostname.endswith(".local") else hostname
    info = ServiceInfo(
        "_http._tcp.local.",
        f"{label}._http._tcp.local.",
        addresses=[socket.inet_aton(ip_text)],
        port=5000,
        properties={"machine_id": MACHINE_ID.encode("utf-8")},
        server=f"{hostname}.",
    )
    zc = None
    try:
        zc = Zeroconf(ip_version=IPVersion.V4Only)
        zc.register_service(info)
    except Exception as exc:
        print(f"[MDNS] Advertisement failed: {exc}")
        if zc is not None:
            try:
                zc.close()
            except Exception:
                pass
        return
    _zeroconf = zc
    _mdns_service = info
    print(f"[MDNS] Advertising {hostname} at {ip_text}:5000")

atexit.register(stop_mdns_advertisement)
start_mdns_advertisement()

import cv2
from flask import Flask, Response, jsonify, request
from ultralytics import YOLO

app = Flask(__name__)

print("[INIT] Loading CacaoScan AI Brain (best.pt)...")
model = YOLO('best.pt')

_camera_index_raw = os.getenv("CACAO_CAMERA_INDEX", "0").strip()
try:
    CAMERA_INDEX = int(_camera_index_raw)
except ValueError:
    print(f"[CAMERA] CACAO_CAMERA_INDEX={_camera_index_raw} is not an integer.", file=sys.stderr)
    raise SystemExit(1)

print(f"[CAMERA] Source index: {CAMERA_INDEX}")
cap = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 640)
cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
camera_opened = cap.isOpened()
print(f"[CAMERA] Opened: {'YES' if camera_opened else 'NO'}")
if not camera_opened:
    print("[CAMERA] Camera unavailable.", file=sys.stderr)
    raise SystemExit(1)

latest_raw_frame = None
latest_display_frame = None
frame_lock = threading.Lock()
inference_lock = threading.Lock()

EVENT_BUFFER_LIMIT = 50
stream_id = secrets.token_hex(8)
event_counter = 0
event_buffer = []
event_lock = threading.Lock()

def record_classification_event(classification, bean_id=None):
    global event_counter
    if classification == "EMPTY":
        return
    event = {
        "event_id": None,
        "operational_class": classification,
    }
    if bean_id is not None:
        event["bean_id"] = bean_id
        event["stage"] = "classified"
    with event_lock:
        event_counter += 1
        event["event_id"] = event_counter
        event_buffer.append(event)
        if len(event_buffer) > EVENT_BUFFER_LIMIT:
            del event_buffer[:-EVENT_BUFFER_LIMIT]

def classify_frame(frame):
    with inference_lock:
        results = model.predict(frame, imgsz=640, conf=0.40, verbose=False)[0]

    boxes = []
    for box in results.boxes:
        label_name = results.names[int(box.cls[0].item())]
        conf = float(box.conf[0].item())
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        boxes.append((label_name, conf, x1, y1, x2, y2))

    labels = [item[0] for item in boxes]
    selected_index = None
    if "Rejected" in labels:
        selected_index = labels.index("Rejected")
    elif "Needs_Drying" in labels:
        selected_index = labels.index("Needs_Drying")
    elif boxes:
        selected_index = 0

    if selected_index is None:
        operational_class = "EMPTY"
        confidence = 0.0
    else:
        operational_class = boxes[selected_index][0]
        confidence = boxes[selected_index][1]

    annotated = frame.copy()
    for label_name, conf, x1, y1, x2, y2 in boxes:
        if label_name == "Rejected":
            color = (0, 0, 255)
        elif label_name == "Needs_Drying":
            color = (0, 255, 255)
        else:
            color = (0, 255, 0)
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
        tag = f"{label_name} {conf*100:.1f}%"
        (w_text, _h_text), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        cv2.rectangle(annotated, (x1, y1 - 20), (x1 + w_text + 4, y1), color, -1)
        cv2.putText(annotated, tag, (x1 + 2, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA)
    cv2.putText(
        annotated,
        f"LIVE DETECTIONS: {len(boxes)} BEANS | SORT: {operational_class}",
        (15, 25),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.55,
        (255, 255, 255),
        2,
    )
    return operational_class, confidence, annotated

def copy_latest_frame():
    with frame_lock:
        if latest_raw_frame is None:
            return None
        return latest_raw_frame.copy()

def parse_bean_id(raw):
    text = (raw or "").strip()
    if text == "":
        return None
    if not text.isdigit() or len(text) > 10:
        return False
    return int(text)

@app.route('/health', methods=['GET'])
def health():
    return MACHINE_ID, 200

@app.route('/trigger', methods=['GET'])
def trigger_ai():
    requested_id = (request.args.get("machine_id") or "").strip()
    if requested_id != MACHINE_ID:
        return "machine_id mismatch", 403

    bean_id = parse_bean_id(request.args.get("bean_id"))
    if bean_id is False:
        return "invalid bean_id", 400

    frame = copy_latest_frame()
    if frame is None:
        if bean_id is None:
            return "camera frame unavailable", 503
        return jsonify({"error": "camera frame unavailable"}), 503

    operational_class, confidence, _annotated = classify_frame(frame)
    print(f"\n[SIGNAL] ESP32 Scan Request -> Returning: {operational_class}")
    record_classification_event(operational_class, bean_id)
    if bean_id is None:
        return operational_class
    return jsonify({
        "bean_id": bean_id,
        "operational_class": operational_class,
        "confidence": confidence,
    })

@app.route('/events', methods=['GET'])
def events():
    requested_id = (request.args.get("machine_id") or "").strip()
    if requested_id != MACHINE_ID:
        return "machine_id mismatch", 403
    try:
        after = int(request.args.get("after") or "0")
    except ValueError:
        after = 0
    with event_lock:
        latest_event_id = event_counter
        current_stream = stream_id
        events_after = []
        for event in event_buffer:
            if event["event_id"] <= after:
                continue
            item = {
                "event_id": event["event_id"],
                "operational_class": event["operational_class"],
            }
            if "bean_id" in event:
                item["bean_id"] = event["bean_id"]
                item["stage"] = event["stage"]
            events_after.append(item)
    return jsonify({
        "machine_id": MACHINE_ID,
        "stream_id": current_stream,
        "latest_event_id": latest_event_id,
        "events": events_after,
    })

def generate_mjpeg():
    while True:
        with frame_lock:
            snapshot = None if latest_display_frame is None else latest_display_frame.copy()
        if snapshot is None:
            time.sleep(0.03)
            continue
        ret, jpeg = cv2.imencode('.jpg', snapshot)
        if ret:
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
        time.sleep(0.04)

@app.route('/video_feed', methods=['GET'])
def video_feed():
    return Response(generate_mjpeg(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/vision/frame', methods=['GET'])
def vision_frame():
    snapshot = copy_latest_frame()
    if snapshot is None:
        return "camera frame unavailable", 503
    ok, jpeg = cv2.imencode('.jpg', snapshot)
    if not ok:
        return "jpeg encode failed", 500
    return Response(jpeg.tobytes(), mimetype='image/jpeg')

def start_flask():
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True, use_reloader=False)

threading.Thread(target=start_flask, daemon=True).start()

cv2.namedWindow("CacaoScan - Multi-Bean Vision Feed", cv2.WINDOW_AUTOSIZE)

while True:
    ret, frame = cap.read()
    if not ret:
        time.sleep(0.05)
        continue

    preview = frame.copy()
    with frame_lock:
        latest_raw_frame = preview
        latest_display_frame = preview

    cv2.imshow("CacaoScan - Multi-Bean Vision Feed", preview)
    if (cv2.waitKey(1) & 0xFF) == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()