# Milestone 4 — Dynamic Edge Addressing Review

Review of the working tree against `HEAD`. Firmware was not uploaded.

## 1. Files changed

- `firmware/models/ver_1/CacaoScan_AI.ino`
- `Cacao_Server/edge_server.py`
- `mobile/context/ESP32Context.tsx`
- `mobile/app/settings/hardware.tsx`

`git diff --stat` for those four files:

```
 Cacao_Server/edge_server.py            | 152 +++++++++++++++++++++++++++++++-
 firmware/models/ver_1/CacaoScan_AI.ino | 154 +++++++++++++++++++++++++++++++--
 mobile/app/settings/hardware.tsx       |  18 ++--
 mobile/context/ESP32Context.tsx        |  78 +++++++++++++++--
 4 files changed, 379 insertions(+), 23 deletions(-)
```

That stat is the full diff versus `HEAD`. It includes Milestone 3 identity edits and the older IP and camera edits listed in section 7. The hunks below are the Milestone 4 network changes.

## 2. Firmware — network changes only

`ESPmDNS` include:

```diff
 #include <HTTPClient.h>
+#include <ESPmDNS.h>
```

Verified-address cache, timeouts, and hostname helper:

```diff
 char server_ip[24] = "192.168.1.70";
+char active_edge_ip[24] = "";
 const int SERVER_PORT = 5000;
+const unsigned long MDNS_QUERY_MS = 300;
+const unsigned long HEALTH_TIMEOUT_MS = 400;
+const unsigned long TRIGGER_TIMEOUT_MS = 1500;
+const unsigned long RECOVERY_INTERVAL_MS = 5000;
+bool edgeVerified = false;
+bool recoveryNeeded = false;
+bool recoveryRunning = false;
+unsigned long lastRecoveryAttempt = 0;
+
+String normalizeMachineId(const char* raw) { /* trim, lowercase, hyphenate */ }
+String edgeHostLabel() { return "cacaoscan-" + normalizeMachineId(MACHINE_ID); }
+String controllerHostLabel() { return "cacaoscan-controller-" + normalizeMachineId(MACHINE_ID); }
+
+void invalidateEdge() {
+    active_edge_ip[0] = '\0';
+    edgeVerified = false;
+}
```

`/health` accepts a candidate only on HTTP 200 with a trimmed body equal to `MACHINE_ID`. NVS is written only after that check, and only when the text differs:

```cpp
bool healthMatches(const char* ip) {
    // GET http://<ip>:5000/health
    http.setTimeout(HEALTH_TIMEOUT_MS); // 400
    return httpCode == HTTP_CODE_OK && body == String(MACHINE_ID);
}

bool discoverAndVerify() {
    IPAddress resolved = MDNS.queryHost(label.c_str(), MDNS_QUERY_MS); // 300
    if ((uint32_t)resolved != 0) {
        if (acceptCandidate(candidate)) return true;
    }
    if (acceptCandidate(server_ip)) return true; // same /health check
    invalidateEdge();
    return false;
}
```

Startup discovery runs after Wi-Fi connect. Recovery runs from `loop()`, at most one attempt, and not again for 5 seconds:

```cpp
void setup() {
    setupWiFiPortal();
    startEdgeDiscovery();
}

void loop() {
    serviceEdgeRecovery();
    // existing IR and serial handling follows
}

void serviceEdgeRecovery() {
    if (!recoveryNeeded || recoveryRunning) return;
    if (lastRecoveryAttempt != 0 && (now - lastRecoveryAttempt) < RECOVERY_INTERVAL_MS) return;
    recoveryRunning = true;
    if (discoverAndVerify()) recoveryNeeded = false;
    recoveryRunning = false;
}
```

`triggerAIAndSort()` does not call `queryHost`. The only `queryHost` call is inside `discoverAndVerify()`. Sorting uses `active_edge_ip` only when `edgeVerified` is true. An NVS address that has not passed `/health` is not used:

```cpp
if (!edgeVerified || active_edge_ip[0] == '\0') {
    Serial.println("[EDGE] No verified edge server is available");
    recoveryNeeded = true;
    return;
}
String url = "http://" + String(active_edge_ip) + ":" + String(SERVER_PORT) + "/trigger?machine_id=" + MACHINE_ID;
http.setTimeout(TRIGGER_TIMEOUT_MS); // 1500
```

A failed `/trigger` clears the verified cache before returning:

```cpp
} else {
    Serial.printf("[ERROR] HTTP failed. Code: %d\n", httpCode);
    http.end();
    invalidateEdge();
    recoveryNeeded = true;
    lastRecoveryAttempt = millis();
    return;
}
```

Confirmed values: mDNS timeout 300 ms, `/health` timeout 400 ms, `/trigger` timeout 1500 ms, recovery interval 5000 ms.

Milestone 4 did not change GPIO mappings, the 50 ms IR debounce, `flickGate`, the conveyor relay, the 18-pulse gate timing, the classification-to-gate mapping, or the WiFiManager portal name, password, 60 second timeout, or IR-at-boot reset.

## 3. Edge server — mDNS changes only

`zeroconf` is imported inside `start_mdns_advertisement()`, not at module import. Hostname normalization and LAN selection:

```python
def edge_hostname(machine_id: str) -> str:
    return f"cacaoscan-{normalize_machine_id(machine_id)}.local"

def _ipv4_reject_reason(ip_text: str):
    # rejects non-IPv4, 0.0.0.0, loopback, link-local, and non-private addresses

def choose_advertise_ip():
    override = os.environ.get("CACAO_ADVERTISE_IP", "").strip()
    # logs each skipped adapter
    # a rejected override logs the reason and returns None
    # a usable override is logged and returned
    # otherwise the first 192.168/16, then 10/8, then 172.16/12 address is logged and returned
```

Advertisement:

```python
info = ServiceInfo(
    "_http._tcp.local.",
    f"{label}._http._tcp.local.",
    addresses=[socket.inet_aton(ip_text)],
    port=5000,
    properties={"machine_id": MACHINE_ID.encode("utf-8")},
    server=f"{hostname}.",
)
_zeroconf = Zeroconf(ip_version=IPVersion.V4Only)
_zeroconf.register_service(info)
```

Shutdown cleanup is in section 8. A normal interpreter exit unregisters the service and closes Zeroconf.

`GET /health` still returns `MACHINE_ID` with HTTP 200. `GET /trigger` still returns 403 unless `machine_id` equals `MACHINE_ID`, then returns `current_classification`. Flask still runs with `app.run(host='0.0.0.0', port=5000, debug=False, threaded=True, use_reloader=False)`. The YOLO predict loop, labels, and gate decision order are not in the Milestone 4 diff.

If advertisement fails, the function logs the reason and returns. Flask and inference still start. That covers a missing `zeroconf` package, no usable LAN address, a rejected `CACAO_ADVERTISE_IP`, and an exception from `register_service`. A missing `CACAO_MACHINE_ID` still exits before Flask; that check is the Milestone 3 identity requirement, not an mDNS failure.

## 4. Mobile — shared host changes only

`cacaoscan.edge_host` remains the AsyncStorage key. Stored values are reduced to a host with no scheme, path, or port. The scanner URL is still `ws://${host}:8080`.

`/health` uses the paired profile row and does not write it:

```tsx
const { data, error } = await supabase
  .from('profiles')
  .select('linked_machine_id')
  .eq('id', user.id)
  .maybeSingle();
const linked = !error && typeof data?.linked_machine_id === 'string'
  ? data.linked_machine_id.trim()
  : '';
if (!linked) {
  setEdgeIdentity('unpaired');
  return;
}
const res = await fetch(`http://${cleaned}:5000/health`, { signal: AbortSignal.timeout(4000) });
const body = (await res.text()).trim();
setEdgeIdentity(res.ok && body === linked ? 'matched' : 'mismatch');
```

No signed-in user, a null `linked_machine_id`, or a profile read that does not yield a string sets `unpaired`. Nothing inserts or updates `linked_machine_id`. A failed request sets `unreachable`. Any other response, including a different machine id, sets `mismatch`. The comparison value is `linked`, not a hardcoded `CS-0001`. Neither mobile file contains `CS-0001`.

Hardware Monitor removed `serverIp` and `ESP32_DEFAULT_IP`. The field reads and writes `serverHost` / `setServerHost` from `ESP32Context`. The telemetry request is still `http://${serverHost}/telemetry` with no port, so it still targets port 80. That request was not redesigned and no telemetry route was added.

`mobile/app/settings/vision.tsx` and `mobile/app/manual-override.tsx` have no diff versus `HEAD`. Both still use `192.168.4.1`.

## 5. Dependency

`zeroconf` 0.151.5 was installed with:

```
python -m pip install zeroconf
```

That also installed `ifaddr` 0.2.0. No tracked project file changed. No dependency manifest was added.

## 6. Secret/static scan

Searched the four changed files for `master_pin`, `service_role`, `SUPABASE_SERVICE`, `password`, and `VERIFY_MACHINE_PIN`. No matches. Milestone 4 did not introduce a secret. The mDNS text record is the public machine id only.

## 7. Existing unrelated working-tree changes

These are in the same `git diff` versus `HEAD` and are not Milestone 4:

- Firmware default `server_ip` and NVS fallback changed from `192.168.1.11` to `192.168.1.70` before this milestone. WiFiManager behavior is otherwise the same.
- `MACHINE_ID` `CS-0001` and `/trigger?machine_id=` were added in Milestone 3. The Milestone 4 URL keeps that query and points it at `active_edge_ip` instead of `server_ip`.
- `edge_server.py` required `CACAO_MACHINE_ID`, added `GET /health`, and checks `machine_id` on `/trigger` in Milestone 3.
- Camera capture changed from index `0` to `CAMERA_INDEX = 1` before this milestone. The inference loop was not edited for Milestone 4.

Other tracked diffs versus `HEAD`, outside the four Milestone 4 files:

```
 mobile/app/settings/pairing.tsx | 118 +++++++++++++++++++++++++++++-----------
 mobile/context/AuthContext.tsx  |  34 +++++++-----
 mobile/package-lock.json        |  28 ----------
 mobile/supabase/schema_v2.sql   |  70 ++++++++++++++++++++++++
 4 files changed, 177 insertions(+), 73 deletions(-)
```

Those are the earlier role and pairing edits, plus the lockfile change.

## 8. mDNS Shutdown Cleanup

`atexit` calls `stop_mdns_advertisement()` on normal interpreter shutdown. The service is unregistered only after a successful registration. If advertisement never started, or registration failed and the partial instance was already closed, cleanup returns without doing anything. Exceptions from unregister or close are printed and do not replace the process exit.

```diff
 import atexit
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

 atexit.register(stop_mdns_advertisement)
```

Verification with `CACAO_MACHINE_ID=CS-0001`:

- The edge server logged `cacaoscan-cs-0001.local` at `192.168.1.70`. `GET /health` returned `CS-0001` with HTTP 200. Flask still bound `0.0.0.0:5000`.
- A normal process exit after that advertisement logged `[MDNS] Advertisement removed` and did not print a traceback.
- `CACAO_ADVERTISE_IP=127.0.0.1` was rejected as loopback, advertisement was skipped, and process exit produced no cleanup error.
- A Windows console break of the live camera loop exited with status `3221225786` and did not run Python `atexit`. That stop printed no traceback and no cleanup line. Cleanup runs on normal interpreter shutdown, not on that forced console abort.
