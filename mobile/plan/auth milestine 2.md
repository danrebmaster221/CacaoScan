PLAN / AUDIT ONLY — AUTH MILESTONE 2: REGISTRATION + SIGNUP VERIFICATION

Do not modify files.
Do not stage.
Do not commit.
Do not push.

PROJECT CONTEXT:

Auth Milestone 1 is complete and committed:

- deterministic session restore
- profile loading gate
- profileError / incomplete states
- complete-profile refresh
- logout cleanup
- protected routes
- logout progress/transition
- Android login keyboard behavior

Current stack:
- Expo SDK 57
- React Native 0.86.3

Role hardening is already complete.

profiles.role is the only trusted role source.

GOAL:

Audit the complete EMAIL registration + signup verification flow and identify
the smallest correctness/UX/security fixes needed before implementation.

Focus only on registration and signup email verification.

==================================================
1. REGISTRATION FORM
==================================================

Inspect:

- mobile/app/(auth)/register.tsx
- related auth helpers/context
- Supabase signUp calls
- shared validation utilities/components

Document exactly what fields are collected:

- first name
- last name
- farm location
- email
- password
- confirm password
- anything else

Check:

- trimming whitespace
- empty fields
- email validation
- password rules
- confirm-password match
- duplicate submit prevention
- loading state
- password visibility
- keyboard behavior
- error presentation

Do not redesign the visuals unless correctness requires it.

==================================================
2. SUPABASE SIGNUP
==================================================

Trace the exact:

supabase.auth.signUp(...)

payload.

Confirm:

- which user_metadata fields are sent
- role is NOT sent
- no privileged fields are client-controlled
- email is normalized appropriately
- password is never stored/logged locally

Determine what signUp returns in these cases:

- normal new account
- duplicate email
- weak password
- invalid email
- network failure

Check how each result currently reaches the UI.

==================================================
3. PROFILE CREATION
==================================================

Inspect the current Supabase trigger/function:

handle_new_user

and relevant schema/migrations.

Confirm:

auth.users
→ trigger
→ profiles row

Check:

- SECURITY DEFINER / search_path safety
- default role = farmer
- linked_machine_id = null
- metadata names/farm copying
- what happens if metadata is missing
- what happens if profile insert fails
- whether a partially created auth user can remain

Do NOT redesign the already-completed role hardening.

==================================================
4. SIGNUP EMAIL VERIFICATION
==================================================

Trace the current OTP flow completely.

Determine:

- whether the screen expects a 6-digit code
- verifyOtp type used
- how signup email is preserved between screens
- resend behavior
- resend cooldown if any
- duplicate resend taps
- verification loading state
- invalid code behavior
- expired code behavior
- successful verification behavior

Confirm whether successful verification produces a session immediately.

==================================================
5. POST-VERIFICATION PROFILE LIFECYCLE
==================================================

With Auth Milestone 1 now in place, verify the intended sequence:

signUp
→ verification code
→ verifyOtp succeeds
→ session exists
→ AuthContext loads profiles row
→ ready
→ tabs

If profile row is missing:
→ incomplete
→ complete-profile

If profile query fails:
→ profileError

Registration must not manually bypass the new profile lifecycle.

Inspect whether register.tsx still calls router.replace("/(tabs)") or performs
navigation that should now be owned by the root layout.

==================================================
6. RESEND CODE
==================================================

Audit the resend implementation.

Check:

- exact Supabase method
- whether it resends signup verification
- email source
- cooldown/timer
- UI feedback
- spam-tap protection
- error behavior
- whether countdown survives screen rerender

Recommend the smallest robust behavior.

==================================================
7. BACK / CANCEL / APP RESTART
==================================================

Determine what happens if the user:

- presses Back during verification
- closes the app before entering the OTP
- reopens the app
- tries Login before verifying
- starts registration again with the same email

Do not invent behavior; trace the current implementation.

==================================================
8. ALREADY-REGISTERED EMAIL
==================================================

Audit Supabase's current behavior for an email that already exists.

Important:
Supabase can intentionally avoid clearly revealing whether an email exists,
depending on project settings.

Do not create an account-enumeration vulnerability.

Recommend user-facing messaging that is useful without leaking account
existence unnecessarily.

==================================================
9. SECURITY
==================================================

Check for:

- role in registration metadata
- client-controlled privileged fields
- logging OTP/password/session tokens
- password stored in component/state longer than necessary
- OTP remaining after success
- ability to bypass verification by navigation
- verified session entering protected routes before profile resolution
- profile trigger trusting unsafe metadata

==================================================
10. FEATURE STATUS
==================================================

Return status for:

- Registration form
- Password validation
- Supabase signUp
- Profile trigger
- Signup OTP
- OTP resend
- OTP cooldown
- Duplicate email handling
- App restart during verification
- Post-verification routing
- Missing profile recovery

Mark each:

WORKING
PARTIAL
MISSING
BUG
SECURITY RISK

==================================================
11. RECOMMENDED IMPLEMENTATION
==================================================

Recommend ONE narrow Auth Milestone 2 implementation.

Do not combine forgot/reset password yet.

Prefer fixes limited to registration + signup verification.

==================================================
STRICT SCOPE
==================================================

Do NOT modify:

- login keyboard
- Auth Milestone 1 behavior unless registration integration requires it
- forgot/reset password
- Google OAuth
- account deletion
- pairing
- Supabase role hardening
- edge server
- firmware
- /events
- machine control
- batch integrity

RETURN AUDIT / PLAN ONLY:

A. current registration flow
B. validation findings
C. Supabase signUp behavior
D. profile-trigger behavior
E. OTP verification flow
F. resend flow
G. restart/back behavior
H. security findings
I. post-verification routing findings
J. feature status
K. recommended Auth Milestone 2
L. exact files likely to change

DO NOT IMPLEMENT.