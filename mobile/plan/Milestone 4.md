MILESTONE 4 — DYNAMIC EDGE SERVER ADDRESSING

MODE: PLAN ONLY.
Do not implement yet.

BACKGROUND:

CacaoScan currently has three local components:

1. ESP32-S3 action controller
2. Flask edge server running on the laptop
3. React Native mobile app

The laptop's LAN IP can change when:
- moving to another Wi-Fi network
- DHCP assigns another address
- using another router/hotspot

CURRENT ESP32 BEHAVIOR:

The firmware has:

  char server_ip[24] = "<default>";

but it also:
- reads server_ip from ESP32 Preferences/NVS
- exposes "Laptop AI Server IP" in WiFiManager
- saves the entered value back to NVS

Therefore the compiled IP is only a default, not permanently hardcoded.

However, the ESP32's NVS value and the mobile app's edge-server/IP setting
are independent and can become inconsistent.

CURRENT PROBLEM:

Example:

Laptop:
  192.168.100.25

Mobile:
  192.168.100.25

ESP32 NVS:
  192.168.1.70

The mobile app may reach the edge server while the ESP32 cannot.

Also, on the same remembered Wi-Fi, the laptop can receive a new DHCP address
while the ESP32 auto-connects and continues using the old saved server_ip.

GOAL:

Design the smallest reliable approach so CacaoScan does not require firmware
reflashing when the edge laptop IP changes and so the ESP32/mobile do not
silently target different edge servers.

DO NOT IMPLEMENT YET.

INSPECT FIRST:

Firmware:
- setupWiFiPortal()
- Preferences/NVS server_ip behavior
- WiFiManager custom_server_ip
- how configuration portal is forced/opened
- triggerAIAndSort()
- existing MACHINE_ID

Mobile:
Search active mobile/ source for:
- IP address input fields
- server URL/address settings
- AsyncStorage/network configuration
- Hardware Monitor
- Manual Override
- AI Vision
- any hardcoded 192.168.* addresses
- port 5000
- port 8080
- /video_feed
- /health
- /trigger
- /telemetry

Edge:
- /health
- MACHINE_ID / CACAO_MACHINE_ID
- port 5000
- host binding

ANSWER THESE QUESTIONS:

1. Which mobile IP input currently controls which features?

2. Is there one central mobile edge-server address or multiple unrelated
   hardcoded/configured addresses?

3. Does changing the mobile IP currently affect the ESP32?
   Expected answer should be based on source, not assumption.

4. Does changing the WiFiManager Laptop AI Server IP affect the mobile app?

5. What exactly happens when:
   - moving to a different Wi-Fi
   - staying on the same Wi-Fi but laptop DHCP IP changes
   - ESP32 remembers Wi-Fi but its saved server IP is stale

6. Determine the smallest safe design for this prototype.

PREFERRED DESIGN PRINCIPLES:

- No firmware reflash just to change laptop IP.
- Do not hardcode a deployment-specific laptop IP as the permanent source
  of truth.
- Preserve the existing NVS/WiFiManager capability unless replacing it is
  clearly safer.
- MACHINE_ID remains independent from IP address.
- Use /health to verify that the discovered/configured edge server reports
  the expected machine id.
- Do not treat IP address as machine identity.
- Do not expose secrets.
- Do not put Supabase credentials on ESP32.

CONSIDER, BUT DO NOT AUTOMATICALLY CHOOSE:

A. Keep manual IP configuration but make one clear configuration workflow.

B. Local hostname/mDNS such as:
   cacaoscan-edge.local

C. Local server discovery.

D. Later BLE provisioning of the edge-server address to the ESP32.

Compare complexity and reliability for:
- ESP32-S3
- Expo / React Native Android
- ordinary home/router/hotspot Wi-Fi

Prefer the smallest solution appropriate for the current capstone prototype.

IMPORTANT:

Do not add BLE in this milestone.
Do not redesign pairing.
Do not modify machine PIN security.
Do not modify Supabase.
Do not change conveyor/gates/AI.
Do not use GUI automation.

OUTPUT:

# Milestone 4 — Dynamic Edge Server Addressing

## Current Network Configuration

## Confirmed Conflict

## WiFi Change Scenarios

## Mobile Address Usage

## ESP32 NVS Behavior

## Options Considered

## Recommended Minimal Architecture

## Files Potentially Affected

## Implementation Steps

## Minimal Verification

## Risks

## Out of Scope

PLAN ONLY.
Do not modify files.
Keep the plan narrow.