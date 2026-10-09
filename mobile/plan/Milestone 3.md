MILESTONE 3 — PHYSICAL MACHINE IDENTITY FOUNDATION

MODE: PLAN ONLY.
Do not implement anything yet.

PROJECT:
CacaoScan ESP32-S3 + local Flask edge server + Supabase + React Native mobile.

BACKGROUND:
Milestone 2 hardened machine pairing.

Current security behavior:
- pair_machine validates machine_id + master PIN
- profiles.linked_machine_id is authoritative
- normal users cannot directly assign themselves a linked_machine_id
- wrong PIN / unknown machine fail
- metadata is not trusted as pairing proof

Current limitation:
There is no real machine record yet, and the physical ESP32/edge server do not
have a shared machine identity.

Therefore successful physical-device pairing cannot yet be tested.

GOAL:
Establish a minimal real machine identity across:

ESP32-S3
    ↕
Local Flask Edge Server
    ↕
Supabase machines table

Do NOT implement Bluetooth discovery yet.

DESIRED PROTOTYPE IDENTITY:

Example:
  machine_id = "CS-0001"

Do not assume that exact ID if an existing project convention already exists.
Inspect first.

ARCHITECTURAL RULES:

1. ESP32 may contain a non-secret machine_id constant.

2. DO NOT put the machine master PIN in ESP32 firmware.

3. DO NOT put Supabase service-role credentials in ESP32 firmware.

4. ESP32 must NOT register itself directly in Supabase in this milestone.

5. Supabase machine provisioning is an installation/admin operation.

6. The local edge server must know which machine it belongs to.

7. Eventually the mobile app must be able to compare:
   profiles.linked_machine_id
   with
   edge server machine_id

But do not redesign mobile networking yet.

INSPECT:

Firmware:
- identify the actual current production ESP32 sketch
- determine best minimal location for a machine_id constant
- inspect existing HTTP requests to edge_server.py

Edge:
- inspect edge_server.py
- inspect /health if present
- inspect /stats if present
- determine the smallest way to expose machine_id

Supabase:
- inspect machines table
- inspect pair_machine
- determine how one prototype machine should be provisioned safely
- do not change pair_machine unless absolutely required

Mobile:
- only inspect how linked_machine_id is currently loaded
- do not implement BLE
- do not redesign pairing.tsx

PLAN SHOULD ANSWER:

1. Where should the ESP32 machine_id live?

2. How should edge_server.py obtain the same machine_id?
   Prefer configuration/environment over duplicated uncontrolled constants if
   practical.

3. Should ESP32 include machine_id in requests to the edge server?

4. Should /health and/or /stats return machine_id?

5. How should one prototype machine record be added to Supabase?

6. How can we finish Milestone 2 verification after provisioning that machine?

7. What needs to exist later for Bluetooth discovery, without implementing it now?

SECURITY:
- machine_id is not a secret
- master PIN remains outside firmware
- no service-role credentials on ESP32
- do not expose master_pin from Supabase
- do not print secrets
- preserve local-first architecture

OUT OF SCOPE:
- Bluetooth/BLE implementation
- QR implementation
- mobile redesign
- changing pair_machine security
- login/register/auth
- batches
- AI inference
- conveyor timing
- servo logic
- dataset/training
- new hardware integration
- broad networking refactor

OUTPUT:

# Milestone 3 — Physical Machine Identity Foundation

## Current State

## Identity Flow

## Files Potentially Affected

## Firmware Identity

## Edge Server Identity

## Supabase Provisioning

## Milestone 2 Completion Test

## Future BLE Compatibility

## Implementation Steps

## Minimal Verification

## Risks

## Out of Scope

PLAN ONLY.
Do not modify files.
Do not run migrations.
Do not create machine records.
Do not use GUI automation.
Keep the plan narrow and concise.