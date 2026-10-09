/*
 * ============================================================================
 * CacaoScan Production Master Firmware (v3.0)
 * ============================================================================
 * - Direct Pin Modulation (Zero library bugs, Zero crosstalk)
 * - Safe resting state (Zero stall current, motors stay completely cold)
 * - Dynamic WiFiManager with persistent Laptop IP storage
 * - Dual IR Sensor Debouncing + Real-time HTTP AI Dispatch (<30ms)
 * ============================================================================
 */

#include <WiFi.h>
#include <WiFiManager.h>
#include <Preferences.h>
#include <HTTPClient.h>
#include <ESPmDNS.h>

// --- PIN ASSIGNMENTS ---
#define PIN_IR_ENTRY          1   // AI Trigger & Portal Reset
#define PIN_IR_EXIT           2   // Verification / Audit

#define PIN_SERVO_HOPPER      4   // Hopper Metering (MG996R)
#define PIN_SERVO_GATE1       18  // Rejected (SG90)
#define PIN_SERVO_GATE2       17  // Needs Drying (SG90)
#define PIN_SERVO_GATE3       16  // Criollo (SG90)
#define PIN_SERVO_GATE4       15  // Forastero (SG90)
#define PIN_SERVO_GATE5       7   // Trinitario (SG90)

#define PIN_RELAY_CONVEYOR    46  // 12V Conveyor Motor Relay

// Calibration
const unsigned long DEBOUNCE_MS = 50;

Preferences prefs;
WiFiManager wm;

char server_ip[24] = "192.168.1.11";
char active_edge_ip[24] = "";
const int SERVER_PORT = 5000;
const char MACHINE_ID[] = "CS-0001";
const unsigned long MDNS_QUERY_MS = 300;
const unsigned long HEALTH_TIMEOUT_MS = 400;
const unsigned long TRIGGER_TIMEOUT_MS = 1500;
const unsigned long RECOVERY_INTERVAL_MS = 5000;
bool edgeVerified = false;
bool recoveryNeeded = false;
bool recoveryRunning = false;
unsigned long lastRecoveryAttempt = 0;

struct IrLatch {
    bool armed;
    bool isLow;
    unsigned long edgeMs;
};

IrLatch entryLatch;
IrLatch exitLatch;

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
    String url = "http://" + String(ip) + ":" + String(SERVER_PORT) + "/health";
    http.begin(url);
    http.setConnectTimeout(HEALTH_TIMEOUT_MS);
    http.setTimeout(HEALTH_TIMEOUT_MS);
    int httpCode = http.GET();
    String body = "";
    if (httpCode == HTTP_CODE_OK) {
        body = http.getString();
        body.trim();
    }
    http.end();
    return httpCode == HTTP_CODE_OK && body == String(MACHINE_ID);
}

bool acceptCandidate(const char* ip) {
    if (!healthMatches(ip)) return false;
    rememberVerifiedAddress(ip);
    return true;
}

bool discoverAndVerify() {
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

void startEdgeDiscovery() {
    if (WiFi.status() != WL_CONNECTED) return;
    String controllerName = controllerHostLabel();
    if (!MDNS.begin(controllerName.c_str())) {
        Serial.println("[EDGE] mDNS begin failed");
    } else {
        Serial.printf("[EDGE] Controller hostname %s.local\n", controllerName.c_str());
    }
    if (!discoverAndVerify()) {
        recoveryNeeded = true;
        lastRecoveryAttempt = millis();
    }
}

void serviceEdgeRecovery() {
    if (!recoveryNeeded || recoveryRunning) return;
    if (WiFi.status() != WL_CONNECTED) return;
    unsigned long now = millis();
    if (lastRecoveryAttempt != 0 && (now - lastRecoveryAttempt) < RECOVERY_INTERVAL_MS) return;
    recoveryRunning = true;
    lastRecoveryAttempt = now;
    if (discoverAndVerify()) recoveryNeeded = false;
    recoveryRunning = false;
}

// Direct 50Hz Pulse Generator (No timers, 100% independent)
void flickGate(int pin, const char* label) {
    Serial.printf("[ACTION] Flicking %s (GPIO %d) -> 90 deg\n", label, pin);

    // 18 pulses @ 1800us = 360ms sweep to 90 degrees
    for (int i = 0; i < 18; i++) {
        digitalWrite(pin, HIGH);
        delayMicroseconds(1800);
        digitalWrite(pin, LOW);
        delayMicroseconds(18200);
    }

    // 18 pulses @ 1000us = 360ms return to 0 degrees neutral
    for (int i = 0; i < 18; i++) {
        digitalWrite(pin, HIGH);
        delayMicroseconds(1000);
        digitalWrite(pin, LOW);
        delayMicroseconds(19000);
    }

    // Rest pin at 0V (0 Amps, completely cold)
    digitalWrite(pin, LOW);
    Serial.printf("[ACTION] %s back at neutral (0 deg).\n", label);
}

void setupWiFiPortal() {
    prefs.begin("cacaoscan", false);
    String savedIP = prefs.getString("server_ip", "192.168.1.11");
    savedIP.toCharArray(server_ip, sizeof(server_ip));

    WiFiManagerParameter custom_server_ip("server_ip", "Laptop AI Server IP", server_ip, 24);
    wm.addParameter(&custom_server_ip);
    wm.setConfigPortalTimeout(60);

    // Hold IR Sensor 1 on boot to force reset settings
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
            prefs.putString("server_ip", String(server_ip));
        }
    }
    prefs.end();
}

void triggerAIAndSort() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[ERROR] WiFi disconnected!");
        return;
    }
    if (!edgeVerified || active_edge_ip[0] == '\0') {
        Serial.println("[EDGE] No verified edge server is available");
        recoveryNeeded = true;
        return;
    }

    HTTPClient http;
    String url = "http://" + String(active_edge_ip) + ":" + String(SERVER_PORT) + "/trigger?machine_id=" + MACHINE_ID;

    unsigned long reqStart = millis();
    http.begin(url);
    http.setConnectTimeout(TRIGGER_TIMEOUT_MS);
    http.setTimeout(TRIGGER_TIMEOUT_MS);

    int httpCode = http.GET();
    unsigned long latency = millis() - reqStart;

    if (httpCode == HTTP_CODE_OK) {
        String classification = http.getString();
        classification.trim();

        Serial.printf("\n>>> [AI RESULT]: '%s' | Latency: %lu ms <<<\n", classification.c_str(), latency);

        // Quality-First Physical Gate Actuation
        if (classification == "Rejected") {
            flickGate(PIN_SERVO_GATE1, "Gate 1 (Rejected)");
        }
        else if (classification == "Needs_Drying") {
            flickGate(PIN_SERVO_GATE2, "Gate 2 (Needs Drying)");
        }
        else if (classification == "Criollo") {
            flickGate(PIN_SERVO_GATE3, "Gate 3 (Criollo)");
        }
        else if (classification == "Forastero") {
            flickGate(PIN_SERVO_GATE4, "Gate 4 (Forastero)");
        }
        else if (classification == "Trinitario") {
            flickGate(PIN_SERVO_GATE5, "Gate 5 (Trinitario)");
        }
        else if (classification == "EMPTY") {
            Serial.println("[INFO] Visual frame empty.");
        }
    } else {
        Serial.printf("[ERROR] HTTP failed. Code: %d\n", httpCode);
        http.end();
        invalidateEdge();
        recoveryNeeded = true;
        lastRecoveryAttempt = millis();
        return;
    }

    http.end();
}

void setup() {
    delay(3000);
    Serial.begin(115200);

    // 1. Configure Pins
    pinMode(PIN_IR_ENTRY, INPUT_PULLUP);
    pinMode(PIN_IR_EXIT,  INPUT_PULLUP);

    pinMode(PIN_RELAY_CONVEYOR, OUTPUT);
    digitalWrite(PIN_RELAY_CONVEYOR, LOW); // Conveyor OFF by default

    pinMode(PIN_SERVO_HOPPER, OUTPUT); digitalWrite(PIN_SERVO_HOPPER, LOW);
    pinMode(PIN_SERVO_GATE1,  OUTPUT); digitalWrite(PIN_SERVO_GATE1,  LOW);
    pinMode(PIN_SERVO_GATE2,  OUTPUT); digitalWrite(PIN_SERVO_GATE2,  LOW);
    pinMode(PIN_SERVO_GATE3,  OUTPUT); digitalWrite(PIN_SERVO_GATE3,  LOW);
    pinMode(PIN_SERVO_GATE4,  OUTPUT); digitalWrite(PIN_SERVO_GATE4,  LOW);
    pinMode(PIN_SERVO_GATE5,  OUTPUT); digitalWrite(PIN_SERVO_GATE5,  LOW);

    // 2. Connect Wi-Fi
    setupWiFiPortal();
    startEdgeDiscovery();

    Serial.println("\n==================================================");
    if (edgeVerified) {
        Serial.printf("  CACAOSCAN ARMED & READY: http://%s:%d\n", active_edge_ip, SERVER_PORT);
    } else {
        Serial.println("  CACAOSCAN ONLINE: no verified edge server");
    }
    Serial.printf("  MACHINE ID: %s\n", MACHINE_ID);
    Serial.println("  Wave hand or bean across IR Sensor 1 to trigger ");
    Serial.println("==================================================\n");

    initIrLatch(entryLatch, PIN_IR_ENTRY);
    initIrLatch(exitLatch, PIN_IR_EXIT);
}

void loop() {
    unsigned long now = millis();
    serviceEdgeRecovery();

    // 1. Entry Sensor (GPIO 1) -> Triggers AI & Sorts Bean
    if (irBlockageReady(entryLatch, PIN_IR_ENTRY, now)) {
        Serial.printf("\n[SENSOR HIT] Entry IR tripped at %lu ms\n", now);
        triggerAIAndSort();
    }

    // 2. Exit Sensor (GPIO 2) -> Audit Bean Pass-through
    if (irBlockageReady(exitLatch, PIN_IR_EXIT, now)) {
        Serial.printf("[AUDIT] Exit IR tripped at %lu ms (Passed).\n", now);
    }

    // 3. Serial manual overrides (Diagnostic backup)
    if (Serial.available() > 0) {
        char c = Serial.read();
        if (c == '1') flickGate(PIN_SERVO_GATE1,  "Gate 1 (Rejected)");
        if (c == '2') flickGate(PIN_SERVO_GATE2,  "Gate 2 (Needs Drying)");
        if (c == '3') flickGate(PIN_SERVO_GATE3,  "Gate 3 (Criollo)");
        if (c == '4') flickGate(PIN_SERVO_GATE4,  "Gate 4 (Forastero)");
        if (c == '5') flickGate(PIN_SERVO_GATE5,  "Gate 5 (Trinitario)");
        if (c == '0') flickGate(PIN_SERVO_HOPPER, "Hopper (MG996R)");
    }

    delay(10);
}