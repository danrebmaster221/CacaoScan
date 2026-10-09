MILESTONE 2 — MACHINE PAIRING PIN ENFORCEMENT

MODE: PLAN ONLY.
Do not modify files yet.

PROJECT:
CacaoScan mobile app + Supabase.

GOAL:
Make machine pairing fail closed.

KNOWN RISK:
Inspect the current machine pairing flow, especially:
mobile/app/settings/pairing.tsx

Current behavior may fall back to metadata-only pairing when the secure
`pair_machine` RPC fails or rejects the PIN.

This can allow an invalid PIN or RPC failure to appear as a successful pairing.

REQUIRED BEHAVIOR:
- Pairing succeeds only after the trusted Supabase pairing operation succeeds.
- Wrong PIN must fail.
- RPC/database failure must fail.
- Network failure must fail.
- No fallback may mark the machine as paired.
- No user_metadata pairing value may be treated as proof of successful pairing.
- Failed attempts must not modify:
  - profiles.linked_machine_id
  - pairing-related metadata
  - local paired-machine state
- Existing correctly paired users must remain unaffected.

SCOPE:
Inspect only what is required for machine pairing:
- mobile/app/settings/pairing.tsx
- existing Supabase pair_machine RPC definition if present
- directly related pairing helper only if actually used

DO NOT:
- change Login
- change Register
- change Profile
- change role authorization
- change MFA/OTP
- change password reset
- change batches
- change Flask
- change firmware
- change hardware logic
- redesign UI
- add dependencies
- refactor unrelated code
- use GUI/browser automation
- implement anything yet

RULES:
- Smallest safe fix.
- Pairing must fail closed.
- Supabase/database is the authority for pairing.
- Do not trust user_metadata as authoritative pairing state.
- Do not expose service-role credentials.
- Do not invent a new pairing architecture.
- Preserve current machine_id / master_pin design unless a minimal security fix requires otherwise.
- Do not silently swallow pairing errors.
- User-facing error text may remain generic, but code must distinguish success from failure internally.

STATIC CHECKS:
Before proposing changes, search active mobile/ source for:
- pair_machine
- linked_machine_id
- paired_machine
- master_pin
- pairing

Determine which value is currently treated as the authoritative pairing state.

MINIMAL VERIFICATION PLAN:
No GUI automation.

Plan only these targeted checks:

1. Correct machine ID + correct PIN
   Expected: pairing succeeds and trusted DB linkage is created.

2. Correct machine ID + wrong PIN
   Expected: pairing fails and no pairing state changes.

3. Unknown machine ID
   Expected: pairing fails.

4. RPC/database failure
   Expected: pairing fails closed; no fallback success.

5. Network failure
   Expected: pairing fails closed.

6. Existing valid pairing
   Expected: still loads correctly.

OUTPUT:
Create a concise Markdown plan:

# Milestone 2 — Machine Pairing PIN Enforcement

## Findings
Confirm the actual current bug.

## Files Affected
Only files truly required.

## Current Pairing Flow
Briefly explain the current authoritative and fallback paths.

## Proposed Change
Exact minimal fail-closed behavior.

## Database / RPC Considerations
State whether the existing pair_machine RPC is sufficient or needs a minimal change.

## Implementation Steps
Small ordered steps.

## Minimal Verification
Only the six targeted checks above.

## Risks / Compatibility
Include existing paired users.

## Out of Scope
Explicitly list untouched systems.

Do not implement.
Do not modify files.
Stop after the Markdown plan.