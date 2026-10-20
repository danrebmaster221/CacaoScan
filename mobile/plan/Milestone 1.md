MILESTONE 1 — ROLE AUTHORIZATION HARDENING

MODE: PLAN ONLY
Do not modify files.
Do not write implementation code yet.

PROJECT:
CacaoScan mobile app + Supabase.

GOAL:
Prevent privilege escalation from `farmer` to `admin`.

KNOWN AREAS TO INSPECT:
1. mobile/supabase/schema_v2.sql
2. mobile/context/AuthContext.tsx

VERIFY THESE RISKS:
- A normal authenticated user may be able to update `profiles.role`.
- The app may trust `auth.user_metadata.role` for privileged role decisions.

REQUIRED RESULT:
- Normal users can still update normal profile fields.
- Normal users cannot change their own role to `admin`.
- `profiles.role` in Supabase is the trusted source for authorization.
- `user_metadata.role` must not grant admin privileges.
- Existing legitimate admins must continue to resolve as admins.

STRICT SCOPE:
Only fix role authorization.

DO NOT:
- change Login
- change Register
- change password reset
- change MFA/OTP
- change Profile save behavior
- change machine pairing
- change batch logic
- change firmware
- change Flask server
- change hardware code
- redesign UI
- add dependencies
- refactor unrelated code
- add a new admin management system
- use GUI/browser automation
- run broad test suites

RULES:
- Smallest safe change only.
- Database/RLS must be the final authority.
- Do not rely only on client-side checks.
- Never trust editable user metadata for admin authorization.
- Do not expose Supabase service-role credentials to the mobile app.
- Preserve current database structure unless a minimal security change requires otherwise.
- Preserve current naming and architecture.
- Mention migration impact if existing policies must be replaced.
- Do not invent features outside this milestone.

MINIMAL TEST REQUIREMENTS FOR THE FUTURE IMPLEMENTATION:
No GUI automation.

Only plan targeted verification for:
1. farmer can update allowed profile fields;
2. farmer cannot update role to admin;
3. existing admin still resolves as admin;
4. forged `user_metadata.role = "admin"` does not grant admin access.
sdfsdf

OUTPUT:
Create a concise Markdown plan using exactly this structure:

# Milestone 1 — Role Authorization Hardening

## Findings
Confirm the actual vulnerability in the current source.

## Files Affected
List only files that truly require modification.

## Database / RLS Change
Explain the minimal database-side protection.

## Mobile Role Resolution Change
Explain how the app will determine the trusted role.

## Implementation Steps
Small ordered steps only.

## Minimal Verification
Targeted checks only. No GUI automation.

## Risks / Compatibility
Include existing admins and existing profile records.

## Out of Scope
List the bugs/features intentionally untouched.

Do not implement anything.
Stop after the Markdown plan.