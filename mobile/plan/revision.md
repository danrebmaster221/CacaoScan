IMPLEMENT AUTH MILESTONE 3 — FORGOT + RESET PASSWORD

Implement the approved:

forgot_password_reset_c38c35ed.plan(3).md

Do not stage.
Do not commit.
Do not push.

IMPORTANT IMPLEMENTATION SAFEGUARD:

Do NOT clear @cacaoscan_password_recovery simply because a SIGNED_IN,
TOKEN_REFRESHED, USER_UPDATED, or another non-terminal auth event occurs
while passwordRecovery is already true for the same user.

While an active recovery workflow exists:

- matching session stays recovery
- passwordRecovery stays true
- recovery marker stays
- tabs stay blocked

Clear the recovery marker only when appropriate:

1. successful password reset followed by successful sign-out
2. startup has marker but no session
3. marker userId does not match session.user.id
4. marker is malformed
5. an explicit normal login begins while passwordRecovery is false and the
   marker is known to be stale

A generic SIGNED_IN event by itself is not sufficient evidence that an
active recovery marker is stale.

==================================================
IMPLEMENT THE APPROVED PLAN
==================================================

FILES:

- mobile/services/supabase.ts
- mobile/context/AuthContext.tsx
- mobile/app/_layout.tsx
- mobile/app/(auth)/_layout.tsx
- mobile/app/(auth)/forgot-password.tsx
- mobile/app/(auth)/reset-password.tsx
- supabase/config.toml

==================================================
SUPABASE CLIENT
==================================================

Switch auth flow to:

flowType: 'pkce'

Preserve existing session persistence/refresh configuration.

==================================================
FORGOT PASSWORD
==================================================

Normalize email:

email.trim().toLowerCase()

Do not HTML-encode it.

Keep the enumeration-safe success response.

Use:

cacaoscan://reset-password

as redirectTo.

Use KeyboardAwareScrollView.

Do not modify Login keyboard code.

==================================================
RECOVERY LINK
==================================================

Listen for:

- cold-start initial URL
- warm-app Linking URL events

Only process a code when the URL is specifically the CacaoScan reset route:

scheme = cacaoscan
destination = reset-password
code = non-empty string

Do NOT intercept Google:

cacaoscan://(auth)/login

Do not exchange arbitrary ?code= URLs.

Do not log:
- URL
- code
- access token
- refresh token
- password
- PKCE verifier

==================================================
CODE DEDUPLICATION
==================================================

Use an in-memory submitted-code set plus in-flight protection.

The same PKCE recovery code must not be exchanged concurrently/twice.

A repeated link while passwordRecovery is already valid must not destroy or
clear the current recovery session.

==================================================
PASSWORD_RECOVERY
==================================================

Handle PASSWORD_RECOVERY before ordinary session logic.

On a valid PASSWORD_RECOVERY session:

- accept/store the session
- passwordRecovery = true
- persist @cacaoscan_password_recovery:
  {
    active: true,
    userId: session.user.id
  }
- clear invalid recovery-link state
- profile may load
- tabs must remain inaccessible

A URL alone must never create the marker.

==================================================
COLD-START RESTORE
==================================================

When restoring Supabase session, read the recovery marker before normal
profile routing.

If:

session exists
AND marker is valid
AND marker.active === true
AND marker.userId === session.user.id

then:

passwordRecovery = true
→ reset-password
→ never tabs

If:

- no session
- malformed marker
- mismatched user

best-effort remove the marker and continue normally.

Storage cleanup failures must not crash startup.

==================================================
ROOT ROUTING
==================================================

passwordRecovery outranks:

- incomplete
- ready
- normal authenticated routing

Protected app routes must require:

profilePhase === 'ready' && !passwordRecovery

When passwordRecovery is true:

route to /(auth)/reset-password

and keep protected tabs/manual override unavailable.

==================================================
RESET PASSWORD SCREEN
==================================================

Create:

mobile/app/(auth)/reset-password.tsx

Include:

- New Password
- Confirm New Password
- visibility toggles
- existing validatePassword rules
- validation feedback
- disabled/loading update button
- KeyboardAwareScrollView

Use the existing policy:

- 12+ characters
- uppercase
- lowercase
- number
- special character

Do not create a second password policy.

Without a real passwordRecovery session:

- do not call updateUser
- show invalid/expired link state
- offer Forgot Password
- offer Login

==================================================
PASSWORD UPDATE
==================================================

Only while passwordRecovery === true:

supabase.auth.updateUser({
  password: newPassword
})

After success:

- clear new password
- clear confirm password
- sign out

After session is successfully gone:

- passwordRecovery = false
- clear invalid-link state
- remove recovery marker
- root routes to Login

If sign-out fails:

- preserve recovery mode
- preserve marker
- keep tabs blocked

Do not accidentally leave a recovery-created session inside the app.

==================================================
SUPABASE CONFIG
==================================================

Add only:

cacaoscan://reset-password

to the appropriate additional_redirect_urls in:

supabase/config.toml

Also remember the hosted Supabase project must contain the exact same URL in:

Authentication
→ URL Configuration
→ Redirect URLs

==================================================
DO NOT TOUCH
==================================================

Do not modify:

- registration
- pending signup behavior
- Login keyboard implementation
- role hardening
- pairing
- machine control
- /events
- firmware
- batch logic

==================================================
RETURN IMPLEMENTATION REPORT
==================================================

Report:

1. PKCE client change
2. forgot-password email normalization
3. exact recovery URL filter
4. Google callback isolation
5. code deduplication
6. PASSWORD_RECOVERY handling
7. recovery marker implementation
8. cold-start recovery restoration
9. handling of SIGNED_IN/TOKEN_REFRESHED while recovery is active
10. root routing/tab guard changes
11. reset-password UI
12. password policy reuse
13. updateUser behavior
14. post-reset sign-out/cleanup
15. local redirect config
16. exact files changed
17. confirm Login keyboard untouched
18. confirm nothing staged/committed/pushed