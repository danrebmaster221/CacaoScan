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
const int SERVER_PORT = 5000;
unsigned long lastEntryTrigger = 0;
unsigned long lastExitTrigger  = 0;

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

    HTTPClient http;
    String url = "http://" + String(server_ip) + ":" + String(SERVER_PORT) + "/trigger";

    unsigned long reqStart = millis();
    http.begin(url);
    http.setTimeout(1500);

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

    Serial.println("\n==================================================");
    Serial.printf("  CACAOSCAN ARMED & READY: http://%s:%d\n", server_ip, SERVER_PORT);
    Serial.println("  Wave hand or bean across IR Sensor 1 to trigger ");
    Serial.println("==================================================\n");
}

void loop() {
    unsigned long now = millis();

    // 1. Entry Sensor (GPIO 1) -> Triggers AI & Sorts Bean
    if (digitalRead(PIN_IR_ENTRY) == LOW && (now - lastEntryTrigger > DEBOUNCE_MS)) {
        lastEntryTrigger = now;
        Serial.printf("\n[SENSOR HIT] Entry IR tripped at %lu ms\n", now);
        triggerAIAndSort();
    }

    // 2. Exit Sensor (GPIO 2) -> Audit Bean Pass-through
    if (digitalRead(PIN_IR_EXIT) == LOW && (now - lastExitTrigger > DEBOUNCE_MS)) {
        lastExitTrigger = now;
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