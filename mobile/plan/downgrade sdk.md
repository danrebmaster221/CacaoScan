PLAN / AUDIT ONLY — CACAOscan NOTIFICATIONS ON EXPO SDK 57

DO NOT DOWNGRADE EXPO.

We are staying on:

- Expo SDK 57
- React Native 0.86.3
- expo-router 57
- current Auth architecture

Remote push notifications do NOT need SDK 52.

We will support notifications using our own native builds:

- Development APK ✅
- EAS Preview / internal-distribution APK ✅
- Production build ✅

Expo Go remote push support is NOT required.

==================================================
IMPORTANT CURRENT STATE
==================================================

Auth Milestone 3 — Forgot/Reset Password has just been implemented and is
currently NOT committed yet.

Do not mix notification work into those changes.

First inspect:

git status --short
git diff --stat

REPORT ONLY.

Do not:

- stage
- commit
- push
- stash
- reset
- checkout
- modify Auth files

==================================================
GOAL
==================================================

Design the correct notification architecture for CacaoScan on Expo SDK 57.

We eventually need:

1. Native notification permission handling
2. Android notification channel(s)
3. Expo push token registration
4. Device token storage
5. Foreground notification behavior
6. Background notification delivery
7. Terminated-app notification delivery
8. Notification tap handling/navigation
9. Development APK support
10. Preview APK support
11. Production-build support

PLAN ONLY.

Do not install expo-notifications yet.

==================================================
1. AUDIT CURRENT DEPENDENCIES
==================================================

Inspect:

- mobile/package.json
- package-lock.json
- mobile/app.json / app.config.*
- eas.json
- mobile/app/_layout.tsx
- current Supabase client/schema/migrations
- any existing notification code
- any existing device-token tables
- any Firebase / google-services configuration

Determine whether these are already installed:

- expo-notifications
- expo-device
- expo-constants

If present, report versions.

If absent, determine the Expo SDK 57-compatible versions that would be
installed using:

npx expo install ...

Do NOT install anything.

==================================================
2. CONFIRM BUILD TYPES
==================================================

Inspect eas.json.

Identify current profiles for:

- development
- preview
- production

Confirm which Android artifact each produces:

- development client APK
- preview/internal-distribution APK
- AAB/APK production as applicable

Notifications must work in both:

A. development build
B. preview/internal build

Do not design around Expo Go.

==================================================
3. APP CONFIG
==================================================

Audit mobile/app.json.

Determine what must be added for expo-notifications.

Check whether we need:

plugins:
- expo-notifications

and any Android-specific configuration such as:

- notification icon
- default color
- sounds
- permissions
- notification channels

Do not change existing:

- app icon
- adaptive icon
- package name
- scheme
- keyboard configuration
- Expo Router configuration

Report exact proposed config changes only.

==================================================
4. EAS PROJECT ID
==================================================

Determine whether Expo projectId is currently configured.

Inspect:

expo.extra.eas.projectId

or equivalent config.

Expo push token registration will likely require:

Notifications.getExpoPushTokenAsync({
  projectId
})

Determine the correct source for projectId.

Do not hardcode a guessed UUID.

If projectId is missing, explain how it should be obtained/configured.

==================================================
5. ANDROID FCM REQUIREMENTS
==================================================

Audit whether the Android project already has Firebase/FCM credentials.

Determine what is required for Expo SDK 57 remote push notifications on:

- development build
- preview build
- production build

Check for:

- google-services.json
- Firebase Android app
- FCM HTTP v1 credentials
- EAS credentials configuration

Do not create or upload credentials.

Report exactly what the developer must configure manually in:

- Firebase Console
- Expo/EAS credentials

Do not expose secrets in source control.

==================================================
6. NOTIFICATION PERMISSION FLOW
==================================================

Design a small notification service/hook.

It should:

1. Check if running on a physical device
2. Read current notification permission
3. Request permission only when appropriate
4. Configure Android channel before token registration
5. Obtain ExpoPushToken
6. Handle failure without crashing the app

Do not ask for permission repeatedly on every launch.

Plan how permission states should be handled:

- granted
- denied
- not determined

==================================================
7. ANDROID CHANNELS
==================================================

Plan Android notification channels.

Do not overengineer.

For CacaoScan, evaluate whether we need:

A. one general CacaoScan channel

or separate channels such as:

- Machine Alerts
- Batch Updates

Recommend the smallest useful design.

If using multiple channels, explain the reason.

==================================================
8. TOKEN STORAGE
==================================================

Design how the Expo push token should be stored.

We already have Supabase and authenticated profiles.

Determine whether to:

A. put token fields on profiles

or preferably

B. create a separate device_push_tokens table

Consider:

- one user may sign in on multiple phones
- same phone token may change
- logout
- token refresh/change
- duplicate tokens
- device reinstall
- multiple users using one device

Recommend a schema.

If proposing a new table, include fields such as appropriate:

- id
- user_id
- expo_push_token
- platform
- device identifier/name only if actually needed
- created_at
- updated_at
- last_seen_at
- enabled

Do NOT collect unnecessary device information.

==================================================
9. RLS / SECURITY
==================================================

If push tokens are stored in Supabase, design proper RLS.

User should only be able to:

- register/update their own device token
- delete/disable their own token
- read their own tokens if reading is needed

Normal mobile clients must NOT be able to read every user's push tokens.

Do not expose service-role keys in the mobile app.

==================================================
10. LOGOUT BEHAVIOR
==================================================

Determine correct logout behavior.

When a user logs out:

Should the push token:

A. be deleted
B. be disabled
C. be disassociated from that user

Recommend the safest approach.

Important:

The same physical device may later be used by another account.

We must not send Account A's notifications to Account B after logout/login.

Do not modify current logout yet.

==================================================
11. TOKEN REFRESH / DUPLICATES
==================================================

Plan:

- app reinstall
- push token changes
- same token registered again
- same account on multiple phones
- one phone switching accounts

Use upsert/unique constraints where appropriate.

No duplicate notification destinations.

==================================================
12. NOTIFICATION LISTENERS
==================================================

Plan the app-level listeners for:

A. notification received while foregrounded

B. notification response / user taps notification

Determine the correct location.

Likely:

mobile/app/_layout.tsx
or
a dedicated notification provider/service

Prefer NOT putting a lot of notification logic directly into _layout.tsx.

Recommend a small isolated architecture.

==================================================
13. FOREGROUND DISPLAY
==================================================

When a push arrives while the app is open:

Determine whether CacaoScan should show:

- banner
- sound
- badge

using Notifications.setNotificationHandler.

Recommend safe defaults.

Do not implement.

==================================================
14. NOTIFICATION TAP NAVIGATION
==================================================

Design notification payloads with a small typed data contract.

Examples may include:

type:
- machine_alert
- batch_complete
- classification_warning

with identifiers such as:

- machine_id
- batch_id

Do not place sensitive data in notification payloads.

Plan safe navigation behavior:

If user taps:

batch_complete
→ appropriate batch/history screen

machine_alert
→ Hardware Monitor / machine status

If the app is:

- foreground
- background
- terminated

the same notification should route correctly.

==================================================
15. AUTHENTICATION + NOTIFICATION TAP
==================================================

This is important.

If a notification is tapped while:

- user is signed out
- AuthContext is restoring
- passwordRecovery is active
- pendingMFA exists
- profilePhase is not ready

do NOT bypass authentication or protected routing.

Plan a pending notification-navigation intent:

notification tap
→ store intended destination in memory
→ wait until profilePhase === ready
→ then navigate

Do not weaken Stack.Protected.

Do not interfere with:

- pending signup
- password recovery
- MFA
- logout transition

==================================================
16. INITIAL NOTIFICATION RESPONSE
==================================================

Plan cold-start behavior.

If Android launches CacaoScan by tapping a notification:

- capture initial notification response
- do not navigate before AuthContext/profile routing is ready
- navigate once only
- prevent duplicate handling if listener fires again

This should follow the same one-shot principle we used for recovery links.

==================================================
17. SERVER-SIDE SENDING
==================================================

Determine where notifications should be SENT from.

Evaluate the existing architecture:

- mobile app
- Supabase
- local CacaoScan edge workstation
- Node edge server

Normal mobile clients must NOT contain server credentials.

Compare:

A. Supabase Edge Function sends through Expo Push Service

B. Node edge server sends through Expo Push Service

C. another safe backend approach

Consider that the current CacaoScan workstation is local-network based and may
not always have internet access.

Recommend which backend should own remote notifications.

==================================================
18. CACAOscan NOTIFICATION EVENTS
==================================================

Audit existing system events and propose which actually deserve push
notifications.

Do NOT notify for every classification.

Potential events to evaluate:

- Batch completed
- Machine disconnected/offline
- Machine error
- Emergency stop
- Batch processing failure
- Important low-confidence/error condition

Avoid notification spam.

Return a recommended minimal V1 event list.

==================================================
19. LOCAL VS REMOTE NOTIFICATIONS
==================================================

Separate clearly:

LOCAL NOTIFICATION
- scheduled/generated directly on phone

REMOTE PUSH
- sent from backend through Expo Push Service/FCM

Determine which CacaoScan features need each.

Do not confuse local notifications with remote push.

==================================================
20. expo-notifications PACKAGE
==================================================

Verify SDK 57 compatibility.

Determine exact installation command that WOULD eventually be used.

Prefer:

npx expo install expo-notifications expo-device expo-constants

only if those packages are actually required/missing.

Do not run it now.

==================================================
21. DEVELOPMENT BUILD TESTING
==================================================

Plan tests for a development APK.

Must test:

- permission prompt
- Android channel
- Expo push token generated
- token saved to Supabase
- foreground receive
- background receive
- killed/terminated receive
- tap handling
- navigation after tap
- logout token cleanup
- login under another user

==================================================
22. PREVIEW BUILD TESTING
==================================================

Plan the same tests for:

eas build --platform android --profile preview

Preview must work without Metro.

Verify:

- push token
- receive push
- tap navigation
- Supabase
- auth
- notification channels

==================================================
23. PRODUCTION SAFETY
==================================================

Plan for production without implementing it.

Check:

- notification icon compatibility
- FCM credentials
- EAS credentials
- channel behavior
- token DB security
- service-role/backend isolation

==================================================
24. DO NOT TOUCH
==================================================

Do NOT modify:

- Expo SDK version
- React Native version
- Expo Router version
- Auth Milestone 3
- Login keyboard
- Register keyboard
- registration
- role hardening
- pairing
- /events
- firmware
- batch integrity
- machine control

No SDK downgrade.

==================================================
RETURN AUDIT / PLAN ONLY
==================================================

Return:

1. current notification-related dependencies
2. SDK 57 compatibility
3. exact packages that would need installing
4. current EAS profiles
5. development-build compatibility
6. preview-build compatibility
7. app.json changes required
8. EAS projectId status
9. FCM/Firebase status
10. Android channel design
11. permission flow
12. push token registration architecture
13. recommended Supabase token schema
14. RLS design
15. logout/token cleanup design
16. foreground listener design
17. notification tap architecture
18. cold-start tap handling
19. interaction with AuthContext/Stack.Protected
20. backend sending recommendation
21. minimal V1 CacaoScan notification events
22. local vs remote notification requirements
23. exact files that would eventually change
24. migrations that would eventually be needed
25. development APK test matrix
26. preview APK test matrix
27. production considerations
28. risks/open questions

DO NOT IMPLEMENT.
DO NOT INSTALL PACKAGES.
DO NOT STAGE.
DO NOT COMMIT.
DO NOT PUSH.