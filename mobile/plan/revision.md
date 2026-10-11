CACAOscan — IMPLEMENT MOBILE AI VISION VIEWER

Implement the approved:

ai_vision_viewer_plan_6d105116.plan.md

with the refinements below.

Do not stage.
Do not commit.
Do not push.

==================================================
GOAL
==================================================

Make the existing AI Vision tab show the real OV3660 camera frame served by:

http://<serverHost>:5000/vision/frame

Architecture:

OV3660 USB
→ Laptop/Desktop
→ edge_server.py
→ /vision/frame
→ Mobile APK AI Vision tab

ESP32-S3 is NOT required for camera viewing.

The phone is viewer only.

==================================================
1. AI VISION MUST NOT DEPEND ON ESP32
==================================================

File:

mobile/app/(tabs)/vision.tsx

Remove camera-view gating based on:

- isConnected / port 8080 websocket
- active batch

Those states may still be displayed as MACHINE status, but they must not
control whether the OV3660 image can appear.

Camera availability and machine-controller availability are separate.

Required valid state:

Edge/Camera: Online
Machine: Offline

while the image still displays.

Do not call connect() just to view the camera.

==================================================
2. USE STORED EDGE HOST
==================================================

Use the existing:

serverHost

from the existing mobile context/configuration.

Frame base URL:

http://${serverHost}:5000/vision/frame

Do not hard-code:

192.168.1.11
192.168.4.1

Do not add mDNS in this pass.

==================================================
3. USE EXPO-IMAGE
==================================================

expo-image is already installed.

Use it for the camera frame.

Set:

cachePolicy="none"

Do not add a new dependency.

==================================================
4. FORCE A FRESH JPEG EACH REFRESH
==================================================

IMPORTANT:

Do not repeatedly render an unchanged /vision/frame URL and assume Android
will always fetch it again.

While the AI Vision tab is focused, update the displayed URI approximately
once per second using a cache-busting query value.

Concept:

http://${serverHost}:5000/vision/frame?t=${timestamp}

Each refresh gets a new URI.

Use one request per refresh.

Do NOT:

fetch the JPEG first
AND
then make expo-image request it again.

Avoid double network requests.

==================================================
5. REFRESH LIFECYCLE
==================================================

Initial interval:

1000 ms

Refresh only while:

- AI Vision tab is focused
- AppState is active

Stop the timer when:

- tab loses focus
- screen unmounts
- app goes to background

Use lifecycle cleanup correctly.

Do not leave duplicate timers after repeated tab navigation.

==================================================
6. CAMERA DISPLAY STATES
==================================================

Implement simple states:

Before first successful frame:
"Loading camera…"

After successful image load:
show the OV3660 image

If a later frame fails:
keep the last successfully displayed image if practical
and show a small:

"Frame stalled"

or equivalent camera warning.

If no frame has ever loaded and the image request fails:
show:

"Camera unavailable"

Do not label that automatically as:

"Machine offline"

Machine and camera are independent.

Do not overcomplicate exact HTTP status differentiation in this first pass if
expo-image does not expose the response status cleanly.

Do NOT perform a second JPEG fetch just to distinguish 503 from network error.

==================================================
7. MACHINE STATUS STAYS SEPARATE
==================================================

The existing machine websocket status can still be shown separately.

Conceptually:

Camera: Online
Machine: Offline

or:

Camera: Online
Machine: Standby

or:

Camera: Online
Machine: Live

But machine status must not hide the camera image.

==================================================
8. REMOVE FAKE BOUNDING BOX
==================================================

The current AI Vision tab draws a placeholder/fake bounding box from the
latest classification event.

Remove that from the raw camera viewer.

This milestone is RAW OV3660 viewing only.

Do not fabricate bounding boxes.

A later milestone will display the actual triggered YOLO annotated frame.

==================================================
9. RETIRE OLD ESP32 CAMERA FETCH
==================================================

File:

mobile/app/settings/vision.tsx

Remove/disable the obsolete fetch to:

http://192.168.4.1/capture

This belongs to the retired ESP32-camera architecture.

There must be only one physical camera architecture:

OV3660 USB
→ laptop edge
→ mobile

Do not introduce a second camera source.

==================================================
10. EDGE SERVER
==================================================

Do NOT modify:

Cacao_Server/edge_server.py

The endpoint already exists:

GET /vision/frame

and returns a JPEG from RAM.

No edge change is needed.

==================================================
11. ANDROID NETWORKING
==================================================

Do not add cleartext/network configuration unless the actual APK/device test
shows that:

http://<LAN-IP>:5000

is blocked.

The app already uses the same local edge host over HTTP for /health.

==================================================
12. DO NOT TOUCH
==================================================

Do not modify:

firmware/
BeanRecord architecture
FreeRTOS scheduler
servo logic
conveyor
hopper
auth
Supabase
notifications
E-stop architecture
YOLO behavior
/trigger behavior

==================================================
13. RETURN
==================================================

Report:

1. exact AI Vision viewer implementation
2. frame URL construction
3. refresh interval
4. focus/AppState cleanup
5. expo-image configuration
6. loading/error/stalled behavior
7. how Machine status remains separate
8. fake bounding box removal
9. old 192.168.4.1/capture removal
10. exact files changed
11. confirm edge server untouched
12. confirm firmware untouched
13. confirm no new dependency
14. confirm nothing staged/committed/pushed