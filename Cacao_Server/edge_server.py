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

COMMAND_ACK_TIMEOUT_S = 8.0
MOTION_COMMANDS = {"START", "PAUSE", "STOP"}
command_lock = threading.Lock()
command_stream_id = secrets.randbits(64)
next_command_id = 1
pending_command = None
print(f"[CMD] command_stream_id={command_stream_id}")

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

def _bgr(hex_color):
    value = int(hex_color.lstrip("#"), 16)
    red = (value >> 16) & 255
    green = (value >> 8) & 255
    blue = value & 255
    return (blue, green, red)

CLASS_BGR = {
    "Criollo": _bgr("#C7FC00"),
    "Forastero": _bgr("#6BDC2A"),
    "Needs_Drying": _bgr("#FF8000"),
    "Rejected": _bgr("#FE0056"),
    "Trinitario": _bgr("#3BC000"),
}
CLASS_TEXT_BGR = {
    "Criollo": (0, 0, 0),
    "Forastero": (0, 0, 0),
    "Needs_Drying": (0, 0, 0),
    "Rejected": (255, 255, 255),
    "Trinitario": (0, 0, 0),
}

def _clamp_box(x1, y1, x2, y2, width, height):
    left = max(0, min(width - 2, int(x1)))
    top = max(0, min(height - 2, int(y1)))
    right = max(left + 2, min(width - 1, int(x2)))
    bottom = max(top + 2, min(height - 1, int(y2)))
    return left, top, right, bottom

def _rounded_rect(image, x1, y1, x2, y2, color, thickness, radius, filled=False):
    radius = max(1, min(int(radius), (x2 - x1) // 2, (y2 - y1) // 2))
    if filled:
        cv2.rectangle(image, (x1 + radius, y1), (x2 - radius, y2), color, -1)
        cv2.rectangle(image, (x1, y1 + radius), (x2, y2 - radius), color, -1)
        cv2.circle(image, (x1 + radius, y1 + radius), radius, color, -1)
        cv2.circle(image, (x2 - radius, y1 + radius), radius, color, -1)
        cv2.circle(image, (x1 + radius, y2 - radius), radius, color, -1)
        cv2.circle(image, (x2 - radius, y2 - radius), radius, color, -1)
        return
    cv2.line(image, (x1 + radius, y1), (x2 - radius, y1), color, thickness)
    cv2.line(image, (x1 + radius, y2), (x2 - radius, y2), color, thickness)
    cv2.line(image, (x1, y1 + radius), (x1, y2 - radius), color, thickness)
    cv2.line(image, (x2, y1 + radius), (x2, y2 - radius), color, thickness)
    cv2.ellipse(image, (x1 + radius, y1 + radius), (radius, radius), 180, 0, 90, color, thickness)
    cv2.ellipse(image, (x2 - radius, y1 + radius), (radius, radius), 270, 0, 90, color, thickness)
    cv2.ellipse(image, (x1 + radius, y2 - radius), (radius, radius), 90, 0, 90, color, thickness)
    cv2.ellipse(image, (x2 - radius, y2 - radius), (radius, radius), 0, 0, 90, color, thickness)

def _draw_selected_annotation(image, label, confidence, box):
    height, width = image.shape[:2]
    x1, y1, x2, y2 = _clamp_box(box[0], box[1], box[2], box[3], width, height)
    color = CLASS_BGR.get(label, (0, 255, 0))
    text_color = CLASS_TEXT_BGR.get(label, (0, 0, 0))
    _rounded_rect(image, x1, y1, x2, y2, color, 2, 8, filled=False)

    tag = f"{label} {confidence * 100:.1f}%"
    (text_w, text_h), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
    pad_x = 8
    pad_y = 5
    pill_w = min(width, text_w + pad_x * 2)
    pill_h = min(height, text_h + pad_y * 2)
    pill_x = x1
    pill_y = y1 - pill_h
    if pill_y < 0:
        pill_y = min(y1, max(0, height - pill_h))
    if pill_x + pill_w > width:
        pill_x = max(0, width - pill_w)
    pill_x = max(0, pill_x)
    pill_y = max(0, min(pill_y, height - pill_h))
    _rounded_rect(
        image,
        pill_x,
        pill_y,
        pill_x + pill_w,
        pill_y + pill_h,
        color,
        1,
        max(1, pill_h // 2),
        filled=True,
    )
    text_x = min(pill_x + pad_x, width - 1)
    text_y = min(pill_y + pad_y + text_h, height - 1)
    cv2.putText(image, tag, (text_x, text_y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, text_color, 1, cv2.LINE_AA)

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
        return "EMPTY", None, None, None

    label_name, confidence, x1, y1, x2, y2 = boxes[selected_index]
    annotated = frame.copy()
    _draw_selected_annotation(annotated, label_name, confidence, (x1, y1, x2, y2))
    return label_name, confidence, [x1, y1, x2, y2], annotated

detection_lock = threading.Lock()
latest_detection = None

def publish_detection(bean_id, operational_class, confidence, bbox, jpeg_bytes):
    global latest_detection
    with detection_lock:
        version = 1 if latest_detection is None else latest_detection["version"] + 1
        latest_detection = {
            "version": version,
            "bean_id": bean_id,
            "operational_class": operational_class,
            "confidence": confidence,
            "bbox": bbox,
            "jpeg": jpeg_bytes,
        }

def classification_metadata():
    with detection_lock:
        if latest_detection is None:
            return None
        item = latest_detection
        return {
            "version": item["version"],
            "bean_id": item["bean_id"],
            "operational_class": item["operational_class"],
            "confidence": item["confidence"],
            "bbox": item["bbox"],
            "has_annotated_frame": item["jpeg"] is not None,
        }

def annotated_jpeg(version):
    with detection_lock:
        if latest_detection is None or latest_detection["version"] != version:
            return None
        return latest_detection["jpeg"]

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

    operational_class, confidence, bbox, annotated = classify_frame(frame)
    jpeg_bytes = None
    if annotated is not None:
        ok, encoded = cv2.imencode(".jpg", annotated)
        if ok:
            jpeg_bytes = encoded.tobytes()
    publish_detection(
        bean_id,
        operational_class,
        None if operational_class == "EMPTY" else confidence,
        None if operational_class == "EMPTY" else bbox,
        None if operational_class == "EMPTY" else jpeg_bytes,
    )
    print(f"\n[SIGNAL] ESP32 Scan Request -> Returning: {operational_class}")
    record_classification_event(operational_class, bean_id)
    if bean_id is None:
        return operational_class
    return jsonify({
        "bean_id": bean_id,
        "operational_class": operational_class,
        "confidence": 0.0 if confidence is None else confidence,
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

@app.route('/vision/last-classification', methods=['GET'])
def last_classification():
    metadata = classification_metadata()
    if metadata is None:
        return jsonify({"error": "no classification"}), 404
    return jsonify(metadata)

@app.route('/vision/annotated', methods=['GET'])
def vision_annotated():
    raw_version = request.args.get("version")
    try:
        version = int(raw_version)
    except (TypeError, ValueError):
        return "version required", 400
    jpeg = annotated_jpeg(version)
    if not jpeg:
        return "annotated frame unavailable", 404
    return Response(jpeg, mimetype="image/jpeg")

@app.route('/vision/frame', methods=['GET'])
def vision_frame():
    snapshot = copy_latest_frame()
    if snapshot is None:
        return "camera frame unavailable", 503
    ok, jpeg = cv2.imencode('.jpg', snapshot)
    if not ok:
        return "jpeg encode failed", 500
    return Response(jpeg.tobytes(), mimetype='image/jpeg')

_next_poll_logged = False

def _command_ids_match(record, stream_text, command_id):
    try:
        stream_id = int(str(stream_text).strip())
        parsed_command_id = int(command_id)
    except (TypeError, ValueError):
        return False
    return stream_id == record["stream_id"] and parsed_command_id == record["command_id"]

def _command_view(record):
    body = {
        "machine_id": MACHINE_ID,
        "command_stream_id": str(record["stream_id"]),
        "command_id": record["command_id"],
        "command": record["command"],
        "status": record["status"],
    }
    if record["status"] == "acknowledged" and record["result_state"]:
        body["result_state"] = record["result_state"]
    if record["status"] == "rejected" and record["reason"]:
        body["reason"] = record["reason"]
    return body

@app.route('/machine/command', methods=['POST'])
def machine_command():
    global next_command_id, pending_command
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "json body required"}), 400
    if (payload.get("machine_id") or "").strip() != MACHINE_ID:
        return jsonify({"error": "machine_id mismatch"}), 403
    command = payload.get("command")
    if command not in MOTION_COMMANDS:
        return jsonify({"error": "unknown command"}), 400

    record = {
        "stream_id": command_stream_id,
        "command_id": None,
        "command": command,
        "status": "pending",
        "result_state": None,
        "reason": None,
        "event": threading.Event(),
    }
    with command_lock:
        if command in ("START", "PAUSE") and pending_command is not None and pending_command["status"] == "pending":
            return jsonify({"status": "rejected", "reason": "busy"}), 409
        if command == "STOP" and pending_command is not None and pending_command["status"] == "pending":
            displaced = pending_command
            displaced["status"] = "superseded"
            displaced["result_state"] = None
            displaced["event"].set()
        record["command_id"] = next_command_id
        next_command_id += 1
        pending_command = record
        print(f"[CMD] pending {command} {record['stream_id']}:{record['command_id']}")

    record["event"].wait(COMMAND_ACK_TIMEOUT_S)
    with command_lock:
        if record["status"] == "pending":
            record["status"] = "timeout"
            record["result_state"] = None
            if pending_command is record:
                pending_command = None
            print(f"[CMD] timeout {record['stream_id']}:{record['command_id']}")
        view = _command_view(record)
    return jsonify(view), 200

@app.route('/machine/command/next', methods=['GET'])
def machine_command_next():
    global _next_poll_logged
    if (request.args.get("machine_id") or "").strip() != MACHINE_ID:
        return jsonify({"error": "machine_id mismatch"}), 403
    if not _next_poll_logged:
        _next_poll_logged = True
        print(f"[CMD] CS-0001 polling /next from {request.remote_addr}")
    with command_lock:
        if pending_command is None or pending_command["status"] != "pending":
            return "", 204
        return jsonify({
            "machine_id": MACHINE_ID,
            "command_stream_id": str(pending_command["stream_id"]),
            "command_id": pending_command["command_id"],
            "command": pending_command["command"],
        })

@app.route('/machine/command/ack', methods=['POST'])
def machine_command_ack():
    global pending_command
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "json body required"}), 400
    if (payload.get("machine_id") or "").strip() != MACHINE_ID:
        return jsonify({"error": "machine_id mismatch"}), 403
    status = payload.get("status")
    if status not in ("acknowledged", "rejected"):
        return jsonify({"error": "invalid status"}), 400
    result_state = payload.get("result_state")
    reason = payload.get("reason")
    if status == "acknowledged" and result_state not in ("RUNNING", "PAUSED", "STOPPED"):
        return jsonify({"error": "invalid result_state"}), 400
    if status == "rejected" and reason not in (None, "calibration_active"):
        return jsonify({"error": "invalid reason"}), 400

    with command_lock:
        current = pending_command
        if current is None or current["status"] != "pending":
            return jsonify({"error": "stale"}), 409
        if not _command_ids_match(current, payload.get("command_stream_id"), payload.get("command_id")):
            return jsonify({"error": "stale"}), 409
        current["status"] = status
        current["result_state"] = result_state if status == "acknowledged" else None
        current["reason"] = reason if status == "rejected" else None
        pending_command = None
        current["event"].set()
        print(f"[CMD] {status} {current['stream_id']}:{current['command_id']} result={current['result_state']}")
    return jsonify({"ok": True}), 200

DISCOVERY_PORT = 5055
DISCOVERY_TOKEN = b"CACAO_DISCOVER"

def discovery_loop():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(("0.0.0.0", DISCOVERY_PORT))
    except OSError as exc:
        print(f"[DISCOVERY] UDP bind failed: {exc}")
        sock.close()
        return
    print(f"[DISCOVERY] Listening on UDP {DISCOVERY_PORT}")
    while True:
        try:
            data, addr = sock.recvfrom(64)
        except OSError:
            continue
        if data.strip() != DISCOVERY_TOKEN:
            continue
        reply = f"machine_id={MACHINE_ID}\nport=5000\n".encode("ascii")
        try:
            sock.sendto(reply, addr)
        except OSError as exc:
            print(f"[DISCOVERY] reply failed: {exc}")

def start_flask():
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True, use_reloader=False)

threading.Thread(target=discovery_loop, daemon=True).start()
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