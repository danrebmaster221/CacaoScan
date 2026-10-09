"""
============================================================================
CacaoScan Edge AI Server - Multi-Bean Real-Time Bounding Box HUD
============================================================================
"""

import atexit
import ipaddress
import os
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
from flask import Flask, Response, request
from ultralytics import YOLO

app = Flask(__name__)

print("[INIT] Loading CacaoScan AI Brain (best.pt)...")
model = YOLO('best.pt')

# 0 = laptop webcam, 1 = usually USB OV camera (try 2 if still wrong)
CAMERA_INDEX = 1
cap = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 640)
cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

latest_raw_frame = None
latest_display_frame = None
frame_lock = threading.Lock()
current_classification = "EMPTY"

@app.route('/health', methods=['GET'])
def health():
    return MACHINE_ID, 200

@app.route('/trigger', methods=['GET'])
def trigger_ai():
    global current_classification
    requested_id = (request.args.get("machine_id") or "").strip()
    if requested_id != MACHINE_ID:
        return "machine_id mismatch", 403
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