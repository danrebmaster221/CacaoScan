/*
 * ============================================================================
 * CacaoScan Production Master Firmware (v3.2 Phase 1C)
 * ============================================================================
 * Bean records and a dedicated HTTP worker. The main loop does not call HTTP.
 * Camera travel times are unset (0). Gates 1-5 use non-blocking LEDC.
 * No automatic conveyor, hopper, or class-to-gate sorting.
 *
 * Distances, comments only, not converted to time:
 *   IR1 10.0 cm, camera center 17.5 cm (7.5 cm after IR1)
 *   Gates after IR1: 18.0, 23.5, 29.0, 34.5, 40.0 cm
 *   IR2 44.0 cm after IR1
 * ============================================================================
 */

#include <WiFi.h>
#include <WiFiManager.h>
#include <Preferences.h>
#include <HTTPClient.h>
#include <ESPmDNS.h>
#include <esp_timer.h>
#include <stdlib.h>

#define PIN_IR_ENTRY          1
#define PIN_IR_EXIT           2
#define PIN_SERVO_HOPPER      4
#define PIN_SERVO_GATE1       18
#define PIN_SERVO_GATE2       17
#define PIN_SERVO_GATE3       16
#define PIN_SERVO_GATE4       15
#define PIN_SERVO_GATE5       7
#define PIN_RELAY_CONVEYOR    46

// GPIO 46 relay is active-low: LOW energizes the conveyor, HIGH releases it.
const int CONVEYOR_ON_LEVEL = LOW;
const int CONVEYOR_OFF_LEVEL = HIGH;
const float CAL_DISTANCE_CM = 44.0f;

const unsigned long DEBOUNCE_MS = 50;
const int SERVER_PORT = 5000;
const char MACHINE_ID[] = "CS-0001";
const unsigned long MDNS_QUERY_MS = 300;
const unsigned long HEALTH_TIMEOUT_MS = 400;
const unsigned long TRIGGER_TIMEOUT_MS = 1500;
const unsigned long RECOVERY_INTERVAL_MS = 5000;
const unsigned long COMMAND_POLL_MS = 250;
const unsigned long COMMAND_HTTP_TIMEOUT_MS = 800;

const int MAX_IN_FLIGHT = 8;
const int REQUEST_QUEUE_DEPTH = 8;
const int RESULT_QUEUE_DEPTH = 16;
const int COMMAND_QUEUE_DEPTH = 2;
const uint32_t HTTP_TASK_STACK_BYTES = 16384;
const UBaseType_t HTTP_TASK_PRIORITY = 1;

const uint32_t SERVO_HZ = 50;
const uint8_t SERVO_RES_BITS = 14;
const uint32_t SERVO_FRAME_US = 1000000UL / SERVO_HZ;
const int SERVO_PHASE_FRAMES = 18;
const uint64_t GATE_PHASE_US = (uint64_t)SERVO_PHASE_FRAMES * SERVO_FRAME_US;
const uint32_t PULSE_EJECT_US = 1800;
const uint32_t PULSE_NEUTRAL_US = 1000;

enum GateMotion : uint8_t { GATE_IDLE = 0, GATE_EJECTING, GATE_RETURNING };
enum GateRequestStatus : uint8_t { GATE_OK = 0, GATE_BUSY, GATE_INVALID, GATE_UNAVAILABLE };

struct GateState {
    uint8_t gate_number;
    uint8_t pin;
    uint8_t channel;
    GateMotion motion;
    GateMotion logged_motion;
    bool busy;
    bool ready;
    int64_t phase_started_us;
    esp_timer_handle_t timer;
};

GateState gates[5];
portMUX_TYPE gateMux = portMUX_INITIALIZER_UNLOCKED;

enum BeanLifecycle : uint8_t {
    LIFE_EMPTY = 0,
    LIFE_DETECTED,
    LIFE_WAIT_CAMERA,
    LIFE_CLASSIFY_QUEUED,
    LIFE_CLASSIFYING,
    LIFE_CLASSIFIED,
    LIFE_FAULTED,
    LIFE_WAIT_GATE,
    LIFE_ACTUATING,
    LIFE_ACTUATED_WAIT_CLEAR,
    LIFE_COMPLETE
};

enum BeanFault : uint8_t {
    FAULT_NONE = 0,
    FAULT_QUEUE_FULL,
    FAULT_HTTP,
    FAULT_BAD_RESPONSE,
    FAULT_STALE_RESULT,
    FAULT_CAMERA_MISSED,
    FAULT_UNMATCHED_IR2,
    FAULT_LATE_GATE
};

enum ReqKind : uint8_t { REQ_TRIGGER = 1 };
enum ResKind : uint8_t { RES_TRIGGER_STARTED = 1, RES_TRIGGER = 2 };

struct BeanRecord {
    uint32_t bean_id;
    int64_t ir1_us;
    int64_t camera_due_us;
    int64_t camera_latest_allowed_us;
    int64_t expected_ir2_us;
    int64_t ir2_window_start_us;
    int64_t ir2_window_end_us;
    char op_class[16];
    float confidence;
    uint8_t target_gate;
    BeanLifecycle lifecycle;
    BeanFault fault;
};

struct EdgeRequest {
    ReqKind kind;
    uint32_t bean_id;
};

struct EdgeResult {
    ResKind kind;
    uint32_t bean_id;
    bool ok;
    BeanFault fault;
    char op_class[16];
    float confidence;
    int http_code;
};

struct IrLatch {
    bool armed;
    bool isLow;
    unsigned long edgeMs;
};

enum CommandKind : uint8_t { CMD_APPLY = 1, CMD_FAILSAFE = 2 };
enum MotionCommand : uint8_t { MOTION_NONE = 0, MOTION_START = 1, MOTION_PAUSE = 2, MOTION_STOP = 3 };
enum CommandAck : uint8_t { ACK_NONE = 0, ACK_ACKNOWLEDGED = 1, ACK_REJECTED = 2 };
enum MachineState : uint8_t { MACHINE_STOPPED = 0, MACHINE_RUNNING = 1, MACHINE_PAUSED = 2 };

struct CommandRequest {
    CommandKind kind;
    uint64_t stream_id;
    uint32_t command_id;
    MotionCommand command;
};

struct CommandResult {
    uint64_t stream_id;
    uint32_t command_id;
    MotionCommand command;
    CommandAck ack;
    MachineState result_state;
    bool applied_start;
};

Preferences prefs;
WiFiManager wm;
IrLatch entryLatch;
IrLatch exitLatch;

BeanRecord beans[MAX_IN_FLIGHT];
uint32_t nextBeanId = 1;
QueueHandle_t requestQueue = nullptr;
QueueHandle_t resultQueue = nullptr;
QueueHandle_t commandRequestQueue = nullptr;
QueueHandle_t commandResultQueue = nullptr;

char server_ip[24] = "192.168.1.70";
char active_edge_ip[24] = "";
volatile bool edgeVerified = false;
bool recoveryNeeded = false;
unsigned long lastRecoveryAttempt = 0;
bool calibrationMode = false;
bool conveyorRunning = false;
MachineState machineState = MACHINE_STOPPED;
portMUX_TYPE commandMux = portMUX_INITIALIZER_UNLOCKED;
bool hasConsumedPair = false;
uint64_t consumedStream = 0;
uint32_t consumedId = 0;
bool runningStartValid = false;
uint64_t runningStream = 0;
uint32_t runningId = 0;
bool loopHasResult = false;
CommandResult loopSavedResult = {};
bool calRunActive = false;
uint32_t calNextRun = 1;
int64_t calIr1Us = 0;
uint32_t calCompleted = 0;
float calSpeedSum = 0.0f;
float calSpeedMin = 0.0f;
float calSpeedMax = 0.0f;

void initIrLatch(IrLatch& ir, int pin);
bool irBlockageReady(IrLatch& ir, int pin, unsigned long now);
const char* faultName(BeanFault fault);
bool slotIsReusable(const BeanRecord& bean);
void clearSlot(BeanRecord& bean);
void applyResult(const EdgeResult& ev);
void postBeanEvent(const EdgeResult& ev);
uint32_t pulseUsToDuty(uint32_t pulseUs);
GateRequestStatus requestGateActuation(uint8_t gateNumber);
void pollMachineCommand();
void drainCommandRequests();
void serviceNetworkFailSafe();

void initIrLatch(IrLatch& ir, int pin) {
    ir.isLow = digitalRead(pin) == LOW;
    ir.armed = !ir.isLow;
    ir.edgeMs = millis();
}

bool irBlockageReady(IrLatch& ir, int pin, unsigned long now) {
    bool low = digitalRead(pin) == LOW;
    if (low != ir.isLow) {
        ir.isLow = low;
        ir.edgeMs = now;
    }
    if (low && ir.armed && (now - ir.edgeMs >= DEBOUNCE_MS)) {
        ir.armed = false;
        return true;
    }
    if (!low && !ir.armed && (now - ir.edgeMs >= DEBOUNCE_MS)) {
        ir.armed = true;
    }
    return false;
}

String normalizeMachineId(const char* raw) {
    String out;
    bool prevHyphen = false;
    for (size_t i = 0; raw[i] != '\0'; i++) {
        char c = raw[i];
        if (c == ' ' || c == '\t') continue;
        if (c >= 'A' && c <= 'Z') c = c - 'A' + 'a';
        bool ok = (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-';
        if (!ok) c = '-';
        if (c == '-' && (prevHyphen || out.length() == 0)) continue;
        prevHyphen = (c == '-');
        out += c;
    }
    while (out.endsWith("-")) out.remove(out.length() - 1);
    return out;
}

String edgeHostLabel() {
    return "cacaoscan-" + normalizeMachineId(MACHINE_ID);
}

String controllerHostLabel() {
    return "cacaoscan-controller-" + normalizeMachineId(MACHINE_ID);
}

void invalidateEdge() {
    active_edge_ip[0] = '\0';
    edgeVerified = false;
}

void rememberVerifiedAddress(const char* ip) {
    strncpy(active_edge_ip, ip, sizeof(active_edge_ip) - 1);
    active_edge_ip[sizeof(active_edge_ip) - 1] = '\0';
    edgeVerified = true;
    if (strcmp(server_ip, active_edge_ip) == 0) return;
    prefs.begin("cacaoscan", false);
    prefs.putString("server_ip", String(active_edge_ip));
    prefs.end();
    strncpy(server_ip, active_edge_ip, sizeof(server_ip) - 1);
    server_ip[sizeof(server_ip) - 1] = '\0';
}

bool healthMatches(const char* ip) {
    if (ip == nullptr || ip[0] == '\0') return false;
    HTTPClient http;
    char url[96];
    snprintf(url, sizeof(url), "http://%s:%d/health", ip, SERVER_PORT);
    http.begin(url);
    http.setConnectTimeout(HEALTH_TIMEOUT_MS);
    http.setTimeout(HEALTH_TIMEOUT_MS);
    int httpCode = http.GET();
    char body[32];
    body[0] = '\0';
    if (httpCode == HTTP_CODE_OK) {
        WiFiClient* stream = http.getStreamPtr();
        int n = 0;
        if (stream != nullptr) n = stream->readBytes(body, sizeof(body) - 1);
        if (n < 0) n = 0;
        body[n] = '\0';
        while (n > 0 && (body[n - 1] == '\n' || body[n - 1] == '\r' || body[n - 1] == ' ')) {
            body[--n] = '\0';
        }
    }
    http.end();
    return httpCode == HTTP_CODE_OK && strcmp(body, MACHINE_ID) == 0;
}

bool acceptCandidate(const char* ip) {
    if (!healthMatches(ip)) return false;
    rememberVerifiedAddress(ip);
    return true;
}

bool discoverAndVerify() {
    if (WiFi.status() != WL_CONNECTED) return false;
    String label = edgeHostLabel();
    IPAddress resolved = MDNS.queryHost(label.c_str(), MDNS_QUERY_MS);
    if ((uint32_t)resolved != 0) {
        char candidate[24];
        resolved.toString().toCharArray(candidate, sizeof(candidate));
        Serial.printf("[EDGE] mDNS candidate %s -> %s\n", label.c_str(), candidate);
        if (acceptCandidate(candidate)) {
            Serial.printf("[EDGE] Verified mDNS edge at %s\n", active_edge_ip);
            return true;
        }
        Serial.println("[EDGE] mDNS candidate failed /health");
    } else {
        Serial.println("[EDGE] mDNS resolution failed");
    }

    Serial.printf("[EDGE] Checking NVS candidate %s\n", server_ip);
    if (acceptCandidate(server_ip)) {
        Serial.printf("[EDGE] Verified NVS edge at %s\n", active_edge_ip);
        return true;
    }

    invalidateEdge();
    Serial.println("[EDGE] No verified edge server is available");
    return false;
}

const char* faultName(BeanFault fault) {
    switch (fault) {
        case FAULT_QUEUE_FULL: return "FAULT_QUEUE_FULL";
        case FAULT_HTTP: return "FAULT_HTTP";
        case FAULT_BAD_RESPONSE: return "FAULT_BAD_RESPONSE";
        case FAULT_STALE_RESULT: return "FAULT_STALE_RESULT";
        case FAULT_CAMERA_MISSED: return "FAULT_CAMERA_MISSED";
        case FAULT_UNMATCHED_IR2: return "FAULT_UNMATCHED_IR2";
        case FAULT_LATE_GATE: return "FAULT_LATE_GATE";
        default: return "FAULT_NONE";
    }
}

bool slotIsReusable(const BeanRecord& bean) {
    if (bean.lifecycle == LIFE_EMPTY || bean.lifecycle == LIFE_FAULTED) return true;
    // Bench only. Remove LIFE_CLASSIFIED when beans advance to WAIT_GATE.
    return bean.lifecycle == LIFE_CLASSIFIED;
}

bool beanIdInUse(uint32_t id) {
    if (id == 0) return true;
    for (int i = 0; i < MAX_IN_FLIGHT; i++) {
        if (beans[i].bean_id == id) return true;
    }
    return false;
}

uint32_t issueBeanId() {
    for (uint32_t n = 0; n < 0xFFFFFFFFu; n++) {
        uint32_t id = nextBeanId;
        nextBeanId++;
        if (nextBeanId == 0) nextBeanId = 1;
        if (!beanIdInUse(id)) return id;
    }
    return 0;
}

int findReusableSlot() {
    for (int i = 0; i < MAX_IN_FLIGHT; i++) {
        if (slotIsReusable(beans[i])) return i;
    }
    return -1;
}

int findBean(uint32_t id) {
    if (id == 0) return -1;
    for (int i = 0; i < MAX_IN_FLIGHT; i++) {
        if (beans[i].bean_id == id && beans[i].lifecycle != LIFE_EMPTY) return i;
    }
    return -1;
}

void clearSlot(BeanRecord& bean) {
    memset(&bean, 0, sizeof(bean));
    bean.lifecycle = LIFE_EMPTY;
    bean.fault = FAULT_NONE;
}

int oldestWaitingCamera() {
    int oldest = -1;
    for (int i = 0; i < MAX_IN_FLIGHT; i++) {
        if (beans[i].lifecycle != LIFE_WAIT_CAMERA) continue;
        if (oldest < 0) {
            oldest = i;
            continue;
        }
        if (beans[i].ir1_us < beans[oldest].ir1_us ||
            (beans[i].ir1_us == beans[oldest].ir1_us && beans[i].bean_id < beans[oldest].bean_id)) {
            oldest = i;
        }
    }
    return oldest;
}

void onEntryDetected() {
    int slot = findReusableSlot();
    if (slot < 0) {
        Serial.println("[FAULT] FAULT_QUEUE_FULL");
        return;
    }
    uint32_t id = issueBeanId();
    if (id == 0) {
        Serial.println("[FAULT] FAULT_QUEUE_FULL");
        return;
    }
    clearSlot(beans[slot]);
    beans[slot].bean_id = id;
    beans[slot].ir1_us = esp_timer_get_time();
    beans[slot].lifecycle = LIFE_DETECTED;
    Serial.printf("[BEAN %u] DETECTED\n", id);
    beans[slot].lifecycle = LIFE_WAIT_CAMERA;
    Serial.printf("[BEAN %u] WAIT_CAMERA\n", id);
}

void dispatchOldestCameraBean() {
    int slot = oldestWaitingCamera();
    if (slot < 0) {
        Serial.println("[BENCH] No WAIT_CAMERA bean");
        return;
    }
    EdgeRequest req = {};
    req.kind = REQ_TRIGGER;
    req.bean_id = beans[slot].bean_id;
    if (requestQueue == nullptr || xQueueSend(requestQueue, &req, 0) != pdTRUE) {
        beans[slot].lifecycle = LIFE_FAULTED;
        beans[slot].fault = FAULT_QUEUE_FULL;
        Serial.printf("[BEAN %u] FAULTED %s\n", beans[slot].bean_id, faultName(FAULT_QUEUE_FULL));
        return;
    }
    beans[slot].lifecycle = LIFE_CLASSIFY_QUEUED;
    Serial.printf("[BEAN %u] CLASSIFY_QUEUED\n", beans[slot].bean_id);
}

void applyResult(const EdgeResult& ev) {
    int slot = findBean(ev.bean_id);
    if (slot < 0) {
        Serial.printf("[BEAN %u] stale result ignored\n", ev.bean_id);
        return;
    }
    BeanRecord& bean = beans[slot];
    if (ev.kind == RES_TRIGGER_STARTED) {
        if (bean.lifecycle != LIFE_CLASSIFY_QUEUED) {
            Serial.printf("[BEAN %u] stale result ignored\n", ev.bean_id);
            return;
        }
        bean.lifecycle = LIFE_CLASSIFYING;
        Serial.printf("[BEAN %u] CLASSIFYING\n", ev.bean_id);
        return;
    }
    if (ev.kind != RES_TRIGGER) {
        Serial.printf("[BEAN %u] stale result ignored\n", ev.bean_id);
        return;
    }
    if (bean.lifecycle != LIFE_CLASSIFYING) {
        Serial.printf("[BEAN %u] stale result ignored\n", ev.bean_id);
        return;
    }
    if (!ev.ok) {
        bean.lifecycle = LIFE_FAULTED;
        bean.fault = ev.fault == FAULT_NONE ? FAULT_HTTP : ev.fault;
        Serial.printf("[BEAN %u] FAULTED %s\n", ev.bean_id, faultName(bean.fault));
        return;
    }
    bean.lifecycle = LIFE_CLASSIFIED;
    bean.fault = FAULT_NONE;
    strncpy(bean.op_class, ev.op_class, sizeof(bean.op_class) - 1);
    bean.op_class[sizeof(bean.op_class) - 1] = '\0';
    bean.confidence = ev.confidence;
    Serial.printf("[BEAN %u] CLASSIFIED %s %.1f%%\n", ev.bean_id, bean.op_class, bean.confidence * 100.0f);
}

void drainResults() {
    if (resultQueue == nullptr) return;
    EdgeResult ev;
    while (xQueueReceive(resultQueue, &ev, 0) == pdTRUE) applyResult(ev);
}

bool jsonSeekValue(const char* body, const char* key, const char** value) {
    char pattern[32];
    snprintf(pattern, sizeof(pattern), "\"%s\"", key);
    const char* p = strstr(body, pattern);
    if (p == nullptr) return false;
    p = strchr(p + strlen(pattern), ':');
    if (p == nullptr) return false;
    p++;
    while (*p == ' ' || *p == '\t' || *p == '\n' || *p == '\r') p++;
    *value = p;
    return *p != '\0';
}

bool parseTriggerBody(const char* body, uint32_t requestId, char* opClass, size_t opLen, float* confidence) {
    const char* value = nullptr;
    if (!jsonSeekValue(body, "bean_id", &value) || *value == '"') return false;
    char* end = nullptr;
    unsigned long parsedId = strtoul(value, &end, 10);
    if (end == value || parsedId != requestId) return false;

    if (!jsonSeekValue(body, "operational_class", &value) || *value != '"') return false;
    value++;
    size_t n = 0;
    while (value[n] != '\0' && value[n] != '"') {
        if (value[n] == '\\') return false;
        if (n + 1 >= opLen) return false;
        opClass[n] = value[n];
        n++;
    }
    if (value[n] != '"' || n == 0) return false;
    opClass[n] = '\0';

    if (!jsonSeekValue(body, "confidence", &value) || *value == '"') return false;
    end = nullptr;
    float parsedConfidence = strtof(value, &end);
    if (end == value) return false;
    *confidence = parsedConfidence;
    return true;
}

void postBeanEvent(const EdgeResult& ev) {
    if (resultQueue == nullptr) return;
    xQueueSend(resultQueue, &ev, portMAX_DELAY);
}

void handleTrigger(uint32_t beanId) {
    EdgeResult started = {};
    started.kind = RES_TRIGGER_STARTED;
    started.bean_id = beanId;
    started.ok = true;
    postBeanEvent(started);

    EdgeResult done = {};
    done.kind = RES_TRIGGER;
    done.bean_id = beanId;
    if (!edgeVerified || active_edge_ip[0] == '\0') {
        done.ok = false;
        done.fault = FAULT_HTTP;
        recoveryNeeded = true;
        postBeanEvent(done);
        return;
    }

    char url[128];
    snprintf(url, sizeof(url), "http://%s:%d/trigger?machine_id=%s&bean_id=%u",
             active_edge_ip, SERVER_PORT, MACHINE_ID, beanId);
    HTTPClient http;
    http.begin(url);
    http.setConnectTimeout(TRIGGER_TIMEOUT_MS);
    http.setTimeout(TRIGGER_TIMEOUT_MS);
    int httpCode = http.GET();
    done.http_code = httpCode;
    if (httpCode != HTTP_CODE_OK) {
        http.end();
        done.ok = false;
        done.fault = FAULT_HTTP;
        invalidateEdge();
        recoveryNeeded = true;
        lastRecoveryAttempt = millis();
        postBeanEvent(done);
        return;
    }

    char body[256];
    body[0] = '\0';
    WiFiClient* stream = http.getStreamPtr();
    int n = 0;
    if (stream != nullptr) n = stream->readBytes(body, sizeof(body) - 1);
    if (n < 0) n = 0;
    body[n] = '\0';
    http.end();

    char opClass[16];
    float confidence = 0.0f;
    if (!parseTriggerBody(body, beanId, opClass, sizeof(opClass), &confidence)) {
        done.ok = false;
        done.fault = FAULT_BAD_RESPONSE;
        postBeanEvent(done);
        return;
    }
    done.ok = true;
    done.fault = FAULT_NONE;
    strncpy(done.op_class, opClass, sizeof(done.op_class) - 1);
    done.op_class[sizeof(done.op_class) - 1] = '\0';
    done.confidence = confidence;
    postBeanEvent(done);
}

void edgeHttpTask(void*) {
    String controllerName = controllerHostLabel();
    if (WiFi.status() == WL_CONNECTED) {
        if (!MDNS.begin(controllerName.c_str())) Serial.println("[EDGE] mDNS begin failed");
        else Serial.printf("[EDGE] Controller hostname %s.local\n", controllerName.c_str());
    }
    if (discoverAndVerify()) recoveryNeeded = false;
    else recoveryNeeded = true;
    lastRecoveryAttempt = millis();

    for (;;) {
        EdgeRequest req;
        if (xQueueReceive(requestQueue, &req, pdMS_TO_TICKS(COMMAND_POLL_MS)) == pdTRUE) {
            if (req.kind == REQ_TRIGGER) handleTrigger(req.bean_id);
        }
        if (edgeVerified && WiFi.status() == WL_CONNECTED) pollMachineCommand();
        if (!recoveryNeeded && edgeVerified) continue;
        unsigned long now = millis();
        if (lastRecoveryAttempt != 0 && (now - lastRecoveryAttempt) < RECOVERY_INTERVAL_MS) continue;
        lastRecoveryAttempt = now;
        if (discoverAndVerify()) recoveryNeeded = false;
    }
}

uint32_t pulseUsToDuty(uint32_t pulseUs) {
    const uint32_t fullScale = 1UL << SERVO_RES_BITS;
    if (pulseUs >= SERVO_FRAME_US) return fullScale - 1;
    return (uint32_t)(((uint64_t)pulseUs * fullScale) / SERVO_FRAME_US);
}

void gateTimerCb(void* arg) {
    GateState* gate = static_cast<GateState*>(arg);
    portENTER_CRITICAL(&gateMux);
    GateMotion motion = gate->motion;
    if (motion == GATE_EJECTING) {
        gate->motion = GATE_RETURNING;
        gate->phase_started_us = esp_timer_get_time();
    } else if (motion == GATE_RETURNING) {
        gate->motion = GATE_IDLE;
    }
    portEXIT_CRITICAL(&gateMux);

    if (motion == GATE_EJECTING) {
        ledcWrite(gate->channel, pulseUsToDuty(PULSE_NEUTRAL_US));
        if (esp_timer_start_once(gate->timer, GATE_PHASE_US) != ESP_OK) {
            ledcWrite(gate->channel, 0);
            portENTER_CRITICAL(&gateMux);
            gate->motion = GATE_IDLE;
            gate->busy = false;
            portEXIT_CRITICAL(&gateMux);
        }
        return;
    }
    if (motion == GATE_RETURNING) {
        ledcWrite(gate->channel, 0);
        portENTER_CRITICAL(&gateMux);
        gate->busy = false;
        portEXIT_CRITICAL(&gateMux);
    }
}

void serviceGateLogs() {
    for (int i = 0; i < 5; i++) {
        portENTER_CRITICAL(&gateMux);
        GateMotion motion = gates[i].motion;
        portEXIT_CRITICAL(&gateMux);
        if (motion == gates[i].logged_motion) continue;
        gates[i].logged_motion = motion;
        if (motion == GATE_EJECTING) Serial.printf("[GATE %u] EJECTING\n", gates[i].gate_number);
        else if (motion == GATE_RETURNING) Serial.printf("[GATE %u] RETURNING\n", gates[i].gate_number);
        else Serial.printf("[GATE %u] IDLE\n", gates[i].gate_number);
    }
}

void initGates() {
    const uint8_t pins[5] = {
        PIN_SERVO_GATE1, PIN_SERVO_GATE2, PIN_SERVO_GATE3, PIN_SERVO_GATE4, PIN_SERVO_GATE5
    };
    const char* names[5] = { "gate1", "gate2", "gate3", "gate4", "gate5" };
    for (int i = 0; i < 5; i++) {
        gates[i].gate_number = i + 1;
        gates[i].pin = pins[i];
        gates[i].channel = i;
        gates[i].motion = GATE_IDLE;
        gates[i].logged_motion = GATE_IDLE;
        gates[i].busy = false;
        gates[i].ready = false;
        gates[i].phase_started_us = 0;
        gates[i].timer = nullptr;
        if (ledcSetup(gates[i].channel, SERVO_HZ, SERVO_RES_BITS) == 0) {
            Serial.printf("[GATE %u] UNAVAILABLE\n", gates[i].gate_number);
            continue;
        }
        ledcAttachPin(gates[i].pin, gates[i].channel);
        ledcWrite(gates[i].channel, 0);
        esp_timer_create_args_t args = {};
        args.callback = gateTimerCb;
        args.arg = &gates[i];
        args.dispatch_method = ESP_TIMER_TASK;
        args.name = names[i];
        if (esp_timer_create(&args, &gates[i].timer) != ESP_OK) {
            Serial.printf("[GATE %u] UNAVAILABLE\n", gates[i].gate_number);
            continue;
        }
        gates[i].ready = true;
    }
}

GateRequestStatus requestGateActuation(uint8_t gateNumber) {
    if (gateNumber < 1 || gateNumber > 5) {
        Serial.printf("[GATE %u] INVALID\n", gateNumber);
        return GATE_INVALID;
    }
    GateState& gate = gates[gateNumber - 1];
    portENTER_CRITICAL(&gateMux);
    if (!gate.ready) {
        portEXIT_CRITICAL(&gateMux);
        Serial.printf("[GATE %u] UNAVAILABLE\n", gateNumber);
        return GATE_UNAVAILABLE;
    }
    if (gate.busy) {
        portEXIT_CRITICAL(&gateMux);
        Serial.printf("[GATE %u] BUSY\n", gateNumber);
        return GATE_BUSY;
    }
    gate.busy = true;
    gate.motion = GATE_EJECTING;
    gate.phase_started_us = esp_timer_get_time();
    portEXIT_CRITICAL(&gateMux);
    ledcWrite(gate.channel, pulseUsToDuty(PULSE_EJECT_US));
    if (esp_timer_start_once(gate.timer, GATE_PHASE_US) != ESP_OK) {
        ledcWrite(gate.channel, 0);
        portENTER_CRITICAL(&gateMux);
        gate.motion = GATE_IDLE;
        gate.busy = false;
        portEXIT_CRITICAL(&gateMux);
        Serial.printf("[GATE %u] UNAVAILABLE\n", gateNumber);
        return GATE_UNAVAILABLE;
    }
    serviceGateLogs();
    return GATE_OK;
}

// Serial 0 only. Blocking hopper diagnostic. Do not use it while checking gate responsiveness.
void flickGate(int pin, const char* label) {
    Serial.printf("[ACTION] Flicking %s (GPIO %d) -> 90 deg\n", label, pin);
    for (int i = 0; i < 18; i++) {
        digitalWrite(pin, HIGH);
        delayMicroseconds(1800);
        digitalWrite(pin, LOW);
        delayMicroseconds(18200);
    }
    for (int i = 0; i < 18; i++) {
        digitalWrite(pin, HIGH);
        delayMicroseconds(1000);
        digitalWrite(pin, LOW);
        delayMicroseconds(19000);
    }
    digitalWrite(pin, LOW);
    Serial.printf("[ACTION] %s back at neutral (0 deg).\n", label);
}

void setupWiFiPortal() {
    prefs.begin("cacaoscan", false);
    String savedIP = prefs.getString("server_ip", "192.168.1.70");
    savedIP.toCharArray(server_ip, sizeof(server_ip));

    WiFiManagerParameter custom_server_ip("server_ip", "Laptop AI Server IP", server_ip, 24);
    wm.addParameter(&custom_server_ip);
    wm.setConfigPortalTimeout(60);

    if (digitalRead(PIN_IR_ENTRY) == LOW) {
        Serial.println("[RESET] Forcing WiFi Portal...");
        wm.resetSettings();
        delay(1000);
    }

    if (wm.autoConnect("CacaoScan-AP", "cacaoscan")) {
        Serial.println("[WIFI] Connected successfully!");
        Serial.print("[WIFI] ESP32 IP: ");
        Serial.println(WiFi.localIP());
        if (strlen(custom_server_ip.getValue()) > 0) {
            strncpy(server_ip, custom_server_ip.getValue(), sizeof(server_ip) - 1);
            server_ip[sizeof(server_ip) - 1] = '\0';
            prefs.putString("server_ip", String(server_ip));
        }
    }
    prefs.end();
}

void setup() {
    delay(3000);
    Serial.begin(115200);

    pinMode(PIN_IR_ENTRY, INPUT_PULLUP);
    pinMode(PIN_IR_EXIT, INPUT_PULLUP);
    pinMode(PIN_RELAY_CONVEYOR, OUTPUT);
    digitalWrite(PIN_RELAY_CONVEYOR, CONVEYOR_OFF_LEVEL);
    pinMode(PIN_SERVO_HOPPER, OUTPUT); digitalWrite(PIN_SERVO_HOPPER, LOW);
    pinMode(PIN_SERVO_GATE1, OUTPUT);
    pinMode(PIN_SERVO_GATE2, OUTPUT);
    pinMode(PIN_SERVO_GATE3, OUTPUT);
    pinMode(PIN_SERVO_GATE4, OUTPUT);
    pinMode(PIN_SERVO_GATE5, OUTPUT);
    initGates();

    setupWiFiPortal();

    requestQueue = xQueueCreate(REQUEST_QUEUE_DEPTH, sizeof(EdgeRequest));
    resultQueue = xQueueCreate(RESULT_QUEUE_DEPTH, sizeof(EdgeResult));
    commandRequestQueue = xQueueCreate(COMMAND_QUEUE_DEPTH, sizeof(CommandRequest));
    commandResultQueue = xQueueCreate(COMMAND_QUEUE_DEPTH, sizeof(CommandResult));
    if (requestQueue == nullptr || resultQueue == nullptr) {
        Serial.println("[FAULT] FAULT_QUEUE_FULL");
    } else {
        if (commandRequestQueue == nullptr || commandResultQueue == nullptr) {
            Serial.println("[FAULT] command queue was not created");
        }
        // Arduino-ESP32 xTaskCreate stack argument is bytes. Unpinned, priority 1.
        if (xTaskCreate(edgeHttpTask, "edgeHttp", HTTP_TASK_STACK_BYTES, nullptr, HTTP_TASK_PRIORITY, nullptr) != pdPASS) {
            Serial.println("[FAULT] edgeHttp task was not created");
        }
    }

    Serial.println("\n==================================================");
    Serial.println("  CACAOSCAN PHASE 1C");
    Serial.printf("  MACHINE ID: %s\n", MACHINE_ID);
    Serial.println("  IR1 allocates a bean. Serial c classifies the oldest.");
    Serial.println("  Serial 1-5 move gates without blocking. Serial 0 is blocking hopper.");
    Serial.println("  Conveyor stays off. Classification does not move a gate.");
    Serial.println("==================================================\n");

    initIrLatch(entryLatch, PIN_IR_ENTRY);
    initIrLatch(exitLatch, PIN_IR_EXIT);
}

void setConveyor(bool running) {
    conveyorRunning = running;
    digitalWrite(PIN_RELAY_CONVEYOR, running ? CONVEYOR_ON_LEVEL : CONVEYOR_OFF_LEVEL);
}

void cancelCalRun(const char* reason) {
    if (!calRunActive) return;
    calRunActive = false;
    calIr1Us = 0;
    Serial.printf("[CAL] Run %u cancelled - %s\n", calNextRun, reason);
}

void enterBeltCal() {
    setConveyor(false);
    if (calRunActive) {
        calRunActive = false;
        calIr1Us = 0;
        Serial.printf("[CAL] Run %u cancelled - enter\n", calNextRun);
    }
    calNextRun = 1;
    calCompleted = 0;
    calSpeedSum = 0.0f;
    calSpeedMin = 0.0f;
    calSpeedMax = 0.0f;
    calibrationMode = true;
    machineState = MACHINE_STOPPED;
    runningStartValid = false;
    Serial.println("[CAL] BELT CAL on. Conveyor OFF.");
}

void startCalConveyor() {
    if (!calibrationMode) return;
    setConveyor(true);
    Serial.println("[CAL] Conveyor ON");
}

void stopCalConveyor() {
    if (!calibrationMode) return;
    setConveyor(false);
    machineState = MACHINE_STOPPED;
    if (calRunActive) cancelCalRun("conveyor stopped");
    else Serial.println("[CAL] Conveyor OFF");
}

void exitBeltCal() {
    setConveyor(false);
    if (calRunActive) cancelCalRun("exit");
    calibrationMode = false;
    machineState = MACHINE_STOPPED;
    runningStartValid = false;
    Serial.println("[CAL] BELT CAL off. Conveyor OFF.");
}

void resetCalRun() {
    if (!calibrationMode) return;
    if (!calRunActive) {
        Serial.println("[CAL] No active run");
        return;
    }
    cancelCalRun("reset");
}

void onCalIr1() {
    if (!conveyorRunning) {
        Serial.println("[CAL] Conveyor stopped - IR1 ignored");
        return;
    }
    if (calRunActive) {
        Serial.println("[CAL] Run already active - ignored");
        return;
    }
    calIr1Us = esp_timer_get_time();
    calRunActive = true;
    Serial.println("[CAL] IR1 detected");
    Serial.printf("[CAL] Run %u started\n", calNextRun);
}

void onCalIr2() {
    if (!calRunActive) {
        Serial.println("[CAL] IR2 with no active run - ignored");
        return;
    }
    int64_t elapsedUs = esp_timer_get_time() - calIr1Us;
    uint32_t run = calNextRun;
    calRunActive = false;
    calIr1Us = 0;
    if (elapsedUs <= 0) {
        Serial.printf("[CAL] Run %u invalid elapsed time\n", run);
        return;
    }
    double elapsedS = (double)elapsedUs / 1000000.0;
    float speed = (float)(CAL_DISTANCE_CM / elapsedS);
    calCompleted++;
    calSpeedSum += speed;
    if (calCompleted == 1 || speed < calSpeedMin) calSpeedMin = speed;
    if (calCompleted == 1 || speed > calSpeedMax) calSpeedMax = speed;
    calNextRun++;
    Serial.printf("[CAL] Run %u\n", run);
    Serial.printf("[CAL] Travel: %.3f s\n", elapsedS);
    Serial.printf("[CAL] Speed: %.2f cm/s\n", speed);
    Serial.printf("[CAL] Runs: %u  Avg: %.2f  Min: %.2f  Max: %.2f cm/s\n",
                  calCompleted, calSpeedSum / (float)calCompleted, calSpeedMin, calSpeedMax);
}

void markConsumedPair(uint64_t streamId, uint32_t commandId) {
    portENTER_CRITICAL(&commandMux);
    hasConsumedPair = true;
    consumedStream = streamId;
    consumedId = commandId;
    portEXIT_CRITICAL(&commandMux);
}

bool pairIsConsumed(uint64_t streamId, uint32_t commandId) {
    portENTER_CRITICAL(&commandMux);
    bool match = hasConsumedPair && consumedStream == streamId && consumedId == commandId;
    portEXIT_CRITICAL(&commandMux);
    return match;
}

const char* machineStateName(MachineState state) {
    if (state == MACHINE_RUNNING) return "RUNNING";
    if (state == MACHINE_PAUSED) return "PAUSED";
    return "STOPPED";
}

bool parseU64Field(const char* body, const char* key, uint64_t* out) {
    const char* value = nullptr;
    if (!jsonSeekValue(body, key, &value)) return false;
    if (*value == '"') value++;
    char* end = nullptr;
    unsigned long long parsed = strtoull(value, &end, 10);
    if (end == value) return false;
    *out = (uint64_t)parsed;
    return true;
}

bool parseCommandName(const char* body, MotionCommand* command) {
    const char* value = nullptr;
    if (!jsonSeekValue(body, "command", &value) || *value != '"') return false;
    value++;
    if (strncmp(value, "START\"", 6) == 0) {
        *command = MOTION_START;
        return true;
    }
    if (strncmp(value, "PAUSE\"", 6) == 0) {
        *command = MOTION_PAUSE;
        return true;
    }
    if (strncmp(value, "STOP\"", 5) == 0) {
        *command = MOTION_STOP;
        return true;
    }
    return false;
}

int readHttpBody(HTTPClient& http, char* body, size_t bodyLen) {
    body[0] = '\0';
    WiFiClient* stream = http.getStreamPtr();
    int n = 0;
    if (stream != nullptr) n = stream->readBytes(body, bodyLen - 1);
    if (n < 0) n = 0;
    body[n] = '\0';
    return n;
}

bool postCommandAck(const CommandResult& result) {
    if (!edgeVerified || active_edge_ip[0] == '\0' || WiFi.status() != WL_CONNECTED) return false;
    char url[128];
    snprintf(url, sizeof(url), "http://%s:%d/machine/command/ack", active_edge_ip, SERVER_PORT);
    char body[224];
    int wrote = 0;
    if (result.ack == ACK_ACKNOWLEDGED) {
        wrote = snprintf(body, sizeof(body),
                         "{\"machine_id\":\"%s\",\"command_stream_id\":\"%llu\",\"command_id\":%u,"
                         "\"status\":\"acknowledged\",\"result_state\":\"%s\"}",
                         MACHINE_ID, (unsigned long long)result.stream_id, result.command_id,
                         machineStateName(result.result_state));
    } else if (result.ack == ACK_REJECTED) {
        wrote = snprintf(body, sizeof(body),
                         "{\"machine_id\":\"%s\",\"command_stream_id\":\"%llu\",\"command_id\":%u,"
                         "\"status\":\"rejected\",\"reason\":\"calibration_active\"}",
                         MACHINE_ID, (unsigned long long)result.stream_id, result.command_id);
    }
    if (wrote <= 0 || (size_t)wrote >= sizeof(body)) return false;

    HTTPClient http;
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.setConnectTimeout(COMMAND_HTTP_TIMEOUT_MS);
    http.setTimeout(COMMAND_HTTP_TIMEOUT_MS);
    int httpCode = http.POST((uint8_t*)body, strlen(body));
    http.end();
    return httpCode == HTTP_CODE_OK;
}

void applyCommandOnLoop(const CommandRequest& req) {
    CommandResult result = {};
    result.stream_id = req.stream_id;
    result.command_id = req.command_id;
    result.command = req.command;

    if (req.kind == CMD_FAILSAFE) {
        if (!calibrationMode && machineState == MACHINE_RUNNING &&
            runningStartValid && runningStream == req.stream_id && runningId == req.command_id) {
            setConveyor(false);
            machineState = MACHINE_STOPPED;
            runningStartValid = false;
            markConsumedPair(req.stream_id, req.command_id);
            Serial.println("[CMD] Unconfirmed START - conveyor STOPPED");
        }
        result.ack = ACK_ACKNOWLEDGED;
        result.result_state = MACHINE_STOPPED;
        loopSavedResult = result;
        loopHasResult = true;
        xQueueSend(commandResultQueue, &result, 0);
        return;
    }

    if (loopHasResult && loopSavedResult.stream_id == req.stream_id && loopSavedResult.command_id == req.command_id) {
        xQueueSend(commandResultQueue, &loopSavedResult, 0);
        return;
    }

    if (req.command == MOTION_STOP) {
        setConveyor(false);
        if (calRunActive) cancelCalRun("network stop");
        calibrationMode = false;
        machineState = MACHINE_STOPPED;
        runningStartValid = false;
        result.ack = ACK_ACKNOWLEDGED;
        result.result_state = MACHINE_STOPPED;
        Serial.println("[CMD] STOP applied STOPPED");
    } else if (calibrationMode) {
        result.ack = ACK_REJECTED;
        result.result_state = MACHINE_STOPPED;
        Serial.println("[CMD] rejected calibration_active");
    } else if (req.command == MOTION_START) {
        setConveyor(true);
        machineState = MACHINE_RUNNING;
        runningStartValid = true;
        runningStream = req.stream_id;
        runningId = req.command_id;
        result.ack = ACK_ACKNOWLEDGED;
        result.result_state = MACHINE_RUNNING;
        result.applied_start = true;
        Serial.println("[CMD] START applied RUNNING");
    } else if (req.command == MOTION_PAUSE) {
        setConveyor(false);
        machineState = MACHINE_PAUSED;
        runningStartValid = false;
        result.ack = ACK_ACKNOWLEDGED;
        result.result_state = MACHINE_PAUSED;
        Serial.println("[CMD] PAUSE applied PAUSED");
    } else {
        result.ack = ACK_REJECTED;
    }

    loopSavedResult = result;
    loopHasResult = true;
    xQueueSend(commandResultQueue, &result, 0);
}

void drainCommandRequests() {
    if (commandRequestQueue == nullptr) return;
    CommandRequest req;
    while (xQueueReceive(commandRequestQueue, &req, 0) == pdTRUE) applyCommandOnLoop(req);
}

void serviceNetworkFailSafe() {
    if (calibrationMode || machineState != MACHINE_RUNNING) return;
    if (WiFi.status() == WL_CONNECTED && edgeVerified) return;
    setConveyor(false);
    machineState = MACHINE_STOPPED;
    if (runningStartValid) {
        markConsumedPair(runningStream, runningId);
        runningStartValid = false;
    }
    Serial.println("[CMD] Network lost - conveyor STOPPED");
}

void pollMachineCommand() {
    static bool commandInFlight = false;
    static CommandRequest inFlight = {};
    static bool savedAckValid = false;
    static uint64_t savedStream = 0;
    static uint32_t savedId = 0;
    static char savedAckBody[224];

    if (commandResultQueue != nullptr) {
        CommandResult pending;
        while (xQueueReceive(commandResultQueue, &pending, 0) == pdTRUE) {
            commandInFlight = false;
            inFlight.stream_id = pending.stream_id;
            inFlight.command_id = pending.command_id;
            bool confirmed = postCommandAck(pending);
            if (pairIsConsumed(pending.stream_id, pending.command_id)) {
                savedAckValid = false;
                continue;
            }
            if (pending.applied_start && !confirmed) {
                CommandRequest failSafe = {};
                failSafe.kind = CMD_FAILSAFE;
                failSafe.stream_id = pending.stream_id;
                failSafe.command_id = pending.command_id;
                failSafe.command = MOTION_START;
                if (commandRequestQueue != nullptr) xQueueSend(commandRequestQueue, &failSafe, 0);
                savedAckValid = false;
                markConsumedPair(pending.stream_id, pending.command_id);
                continue;
            }
            if (confirmed && pending.ack != ACK_NONE) {
                savedStream = pending.stream_id;
                savedId = pending.command_id;
                savedAckValid = true;
                if (pending.ack == ACK_ACKNOWLEDGED) {
                    snprintf(savedAckBody, sizeof(savedAckBody),
                             "{\"machine_id\":\"%s\",\"command_stream_id\":\"%llu\",\"command_id\":%u,"
                             "\"status\":\"acknowledged\",\"result_state\":\"%s\"}",
                             MACHINE_ID, (unsigned long long)pending.stream_id, pending.command_id,
                             machineStateName(pending.result_state));
                } else {
                    snprintf(savedAckBody, sizeof(savedAckBody),
                             "{\"machine_id\":\"%s\",\"command_stream_id\":\"%llu\",\"command_id\":%u,"
                             "\"status\":\"rejected\",\"reason\":\"calibration_active\"}",
                             MACHINE_ID, (unsigned long long)pending.stream_id, pending.command_id);
                }
            }
        }
    }

    if (!edgeVerified || active_edge_ip[0] == '\0' || WiFi.status() != WL_CONNECTED) return;
    char url[128];
    snprintf(url, sizeof(url), "http://%s:%d/machine/command/next?machine_id=%s",
             active_edge_ip, SERVER_PORT, MACHINE_ID);
    HTTPClient http;
    http.begin(url);
    http.setConnectTimeout(COMMAND_HTTP_TIMEOUT_MS);
    http.setTimeout(COMMAND_HTTP_TIMEOUT_MS);
    int httpCode = http.GET();
    char body[256];
    if (httpCode == HTTP_CODE_OK) readHttpBody(http, body, sizeof(body));
    http.end();
    if (httpCode == HTTP_CODE_NO_CONTENT || httpCode == 204) return;
    if (httpCode != HTTP_CODE_OK) return;

    uint64_t streamId = 0;
    uint64_t commandIdWide = 0;
    MotionCommand command = MOTION_NONE;
    if (!parseU64Field(body, "command_stream_id", &streamId)) return;
    if (!parseU64Field(body, "command_id", &commandIdWide) || commandIdWide == 0 || commandIdWide > 0xFFFFFFFFu) return;
    if (!parseCommandName(body, &command)) return;
    uint32_t commandId = (uint32_t)commandIdWide;

    if (pairIsConsumed(streamId, commandId)) return;
    if (commandInFlight && inFlight.stream_id == streamId && inFlight.command_id == commandId) return;
    if (savedAckValid && savedStream == streamId && savedId == commandId) {
        if (!edgeVerified || active_edge_ip[0] == '\0') return;
        char ackUrl[128];
        snprintf(ackUrl, sizeof(ackUrl), "http://%s:%d/machine/command/ack", active_edge_ip, SERVER_PORT);
        HTTPClient ackHttp;
        ackHttp.begin(ackUrl);
        ackHttp.addHeader("Content-Type", "application/json");
        ackHttp.setConnectTimeout(COMMAND_HTTP_TIMEOUT_MS);
        ackHttp.setTimeout(COMMAND_HTTP_TIMEOUT_MS);
        ackHttp.POST((uint8_t*)savedAckBody, strlen(savedAckBody));
        ackHttp.end();
        return;
    }
    if (commandRequestQueue == nullptr) return;

    CommandRequest req = {};
    req.kind = CMD_APPLY;
    req.stream_id = streamId;
    req.command_id = commandId;
    req.command = command;
    if (xQueueSend(commandRequestQueue, &req, 0) != pdTRUE) return;
    commandInFlight = true;
    inFlight = req;
}

void loop() {
    drainResults();
    drainCommandRequests();
    serviceNetworkFailSafe();
    serviceGateLogs();
    unsigned long now = millis();

    if (irBlockageReady(entryLatch, PIN_IR_ENTRY, now)) {
        if (calibrationMode) onCalIr1();
        else onEntryDetected();
    }

    if (irBlockageReady(exitLatch, PIN_IR_EXIT, now)) {
        if (calibrationMode) onCalIr2();
        else Serial.printf("[AUDIT] Exit IR tripped at %lu ms\n", now);
    }

    if (Serial.available() > 0) {
        char c = Serial.read();
        if (calibrationMode) {
            if (c == 'b') enterBeltCal();
            else if (c == 's') startCalConveyor();
            else if (c == 't') stopCalConveyor();
            else if (c == 'r') resetCalRun();
            else if (c == 'x') exitBeltCal();
        } else {
            if (c == '1') requestGateActuation(1);
            if (c == '2') requestGateActuation(2);
            if (c == '3') requestGateActuation(3);
            if (c == '4') requestGateActuation(4);
            if (c == '5') requestGateActuation(5);
            if (c == '0') flickGate(PIN_SERVO_HOPPER, "Hopper (MG996R)");
            if (c == 'c') dispatchOldestCameraBean();
            if (c == 'b') enterBeltCal();
        }
    }

    delay(10);
}
