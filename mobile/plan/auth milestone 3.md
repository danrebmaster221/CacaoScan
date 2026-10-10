PLAN / AUDIT ONLY — AUTH MILESTONE 3: FORGOT PASSWORD + RESET PASSWORD

Do not implement.
Do not modify files.
Do not stage.
Do not commit.
Do not push.

Context:

Auth Milestone 1:
- session/profile lifecycle hardened and physically tested

Auth Milestone 2:
- registration + signup verification complete
- pending signup recovery complete
- duplicate handling complete
- registration keyboard/UI complete

Auth Milestone 2B:
- public.handle_new_user hardened with:
  SECURITY DEFINER
  SET search_path = public
- migration applied and verified
- fresh signup still creates:
  role = farmer
  linked_machine_id = null

Current stack:
- Expo SDK 57.0.27
- React Native 0.86.3
- expo-router 57.0.25
- react-native-keyboard-controller 1.21.9
- Supabase Auth

==================================================
GOAL
==================================================

Audit the existing forgot-password and recovery flow and design the smallest
safe implementation for:

Login
→ Forgot Password
→ Recovery email
→ Deep link back into CacaoScan
→ Reset Password screen
→ New password saved
→ Safe post-reset session/routing behavior

PLAN ONLY.

==================================================
1. INSPECT CURRENT FORGOT PASSWORD
==================================================

Inspect all relevant files, especially:

- mobile/app/(auth)/forgot-password.tsx
- mobile/context/AuthContext.tsx
- mobile/app/_layout.tsx
- mobile/app.json or app.config.*
- mobile/utils/password-validator.ts
- existing auth routes/screens
- Supabase client configuration

Determine:

- current UI
- current validation
- current resetPasswordForEmail call
- exact redirectTo value
- current success/error messages
- whether account existence can be enumerated
- loading/double-submit behavior
- keyboard behavior
- whether it currently works on Android development/production builds

==================================================
2. DEEP LINK CONFIGURATION
==================================================

Inspect the actual Expo scheme/config.

Do not assume the current scheme is correct.

Determine:

- configured app scheme
- whether cacaoscan://reset-password is valid
- whether Expo Router has a route that matches it
- whether Android intent/deep-link handling needs anything additional
- whether development builds differ from production APK behavior

Also identify what must be configured in Supabase:

Authentication
→ URL Configuration / Redirect URLs

Do not invent a URL. Derive it from the actual app configuration.

==================================================
3. SUPABASE PASSWORD RECOVERY BEHAVIOR
==================================================

Audit how the installed Supabase JS version handles password recovery.

Determine:

- what happens when the recovery link opens
- whether Supabase establishes a recovery session automatically
- whether onAuthStateChange emits PASSWORD_RECOVERY
- whether the app currently observes that event
- whether URL tokens/code must be manually parsed
- whether exchangeCodeForSession is required for the current flow

Base the plan on the project's installed Supabase version and current setup,
not an older tutorial.

==================================================
4. RESET PASSWORD SCREEN
==================================================

Determine whether a reset-password screen already exists.

If not, plan the correct Expo Router route.

Required UI:

- New Password
- Confirm New Password
- password visibility toggles
- existing CacaoScan password policy
- validation feedback
- Save/Update Password button
- loading state

Reuse the same password validator used by registration/change-password where
appropriate.

Do not create a second inconsistent password policy.

==================================================
5. RECOVERY ACCESS CONTROL
==================================================

The reset-password screen must not function as an ordinary signed-out route
where anyone can type a password without a valid recovery session.

Plan how it determines:

VALID RECOVERY SESSION
vs
NO / EXPIRED / INVALID RECOVERY SESSION

For invalid/expired recovery:
- do not call updateUser
- show a safe message
- provide a route back to Forgot Password / Login as appropriate

Do not depend only on the presence of URL text as proof.

==================================================
6. PASSWORD UPDATE
==================================================

Audit/plan:

supabase.auth.updateUser({
  password: ...
})

Determine:

- how success is detected
- error mapping
- weak/reused password response handling if applicable
- double-submit protection
- clearing password fields after success

Do not log passwords or recovery tokens.

==================================================
7. POST-RESET SESSION POLICY
==================================================

This needs an explicit design.

Audit current AuthContext/root behavior and decide the safest flow after a
successful password reset.

Compare:

A. keep the recovery-created session and route through normal profile lifecycle

vs

B. explicitly sign out after successful reset and require normal Login with
   the new password

Recommend one for CacaoScan and explain why.

The result must not cause:

- protected tabs flashing
- reset screen routing races
- stale recovery-session state
- root layout fighting manual navigation

Root/AuthContext should remain the authority for authenticated routing where
appropriate.

==================================================
8. AUTH STATE EVENTS
==================================================

Inspect current onAuthStateChange logic.

Determine how these events currently behave:

- INITIAL_SESSION
- SIGNED_IN
- SIGNED_OUT
- TOKEN_REFRESHED
- PASSWORD_RECOVERY

Check whether PASSWORD_RECOVERY would currently be treated as an ordinary
sign-in and immediately route to tabs before the user can set a new password.

This is especially important.

If a dedicated recovery state/phase is needed, describe the smallest design.

Do not redesign the whole AuthContext.

==================================================
9. FORGOT PASSWORD PRIVACY
==================================================

The Forgot Password UI should not reveal whether an arbitrary email exists.

Audit current behavior.

Plan a neutral response such as:

"If an account exists for this email, password reset instructions have been sent."

Use the project's actual UX wording/style where appropriate.

Do not expose raw Supabase account-existence errors.

==================================================
10. PASSWORD POLICY
==================================================

Compare:

- registration password policy
- change-password policy
- proposed reset-password policy

They should be consistent unless there is an intentional documented reason.

Current known registration policy previously required:
- 12+ characters
- uppercase
- lowercase
- number
- special character

Verify against the actual current code.

==================================================
11. EMAIL / LINK REUSE AND EXPIRY
==================================================

Plan behavior for:

- opening a valid recovery link
- expired recovery link
- already-used recovery link
- tapping the link twice
- requesting another reset email
- app already open when link is tapped
- app cold-started from the link

Do not add unnecessary complexity, but avoid dead-end screens.

==================================================
12. SECURITY
==================================================

Verify that the plan:

- stores no recovery tokens manually unless absolutely required
- logs no password/token
- does not expose account existence
- requires a real Supabase recovery session
- does not let normal signed-in sessions accidentally masquerade as recovery
  unless explicitly designed
- clears sensitive form state after success
- does not weaken Auth Milestone 1 routing

==================================================
13. SCOPE
==================================================

Prefer the smallest possible file set.

Likely files may include:

- mobile/app/(auth)/forgot-password.tsx
- a new reset-password route if missing
- mobile/context/AuthContext.tsx
- possibly mobile/app/_layout.tsx only if recovery routing genuinely requires it
- app config only if the current deep-link scheme is wrong/missing

Do NOT touch:

- registration flow
- pending signup flow
- role hardening
- pairing
- machine control
- /events
- firmware
- batch logic

==================================================
RETURN AUDIT + PLAN ONLY
==================================================

Return:

1. current forgot-password implementation
2. actual configured app scheme
3. current redirectTo value
4. whether reset-password route exists
5. current Supabase recovery-session behavior
6. current handling of PASSWORD_RECOVERY
7. whether current root routing would interfere
8. account-enumeration findings
9. password-policy consistency findings
10. recommended recovery architecture
11. recommended post-reset session policy
12. exact files that would change
13. Supabase Dashboard redirect configuration required
14. physical test plan
15. any risks/open questions

DO NOT IMPLEMENT.