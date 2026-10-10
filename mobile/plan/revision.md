IMPLEMENT PASSWORD KEYBOARD LIVE IME CLEARANCE

Do not stage.
Do not commit.
Do not push.

Implement the approved plan:

password_keyboard_clearance_071927cc.plan(3).md

with this clarification:

react-native-keyboard-controller gives us a LIVE keyboard HEIGHT.

Do not assume it exposes a screenY/top value directly.

==================================================
1. INSTALL DEPENDENCY
==================================================

From mobile/, use the Expo-compatible install path:

npx expo install react-native-keyboard-controller

Use the SDK 54 compatible version selected by Expo.

Do not manually force another version unless expo install resolves differently
and report that result.

Do not commit package changes.

==================================================
2. ROOT PROVIDER
==================================================

In:

mobile/app/_layout.tsx

wrap the existing application/navigation tree with KeyboardProvider as
required by the library.

Preserve completely:

- Stack.Protected
- profilePhase routing
- splash logic
- logout transition cover
- all existing auth behavior

Do not restructure navigation.

Because this project already uses edge-to-edge Android behavior, do not add
new keyboard-mode settings to app.json.

==================================================
3. KEEP CURRENT LOGIN BASE AVOIDANCE
==================================================

In:

mobile/app/(auth)/login.tsx

KEEP the existing working Android logic:

keyboard closed
-> paddingBottom = 0

normal first keyboard show
-> existing base padding

keyboard hide
-> paddingBottom = 0 exactly
-> refresh closed-layout baseline

Do not replace that logic with the library's KeyboardAvoidingView.

The controller is being added ONLY to obtain the live keyboard height needed
when Password changes the already-open IME height.

==================================================
4. LIVE KEYBOARD HEIGHT
==================================================

Use an appropriate react-native-keyboard-controller hook/API that receives live
Android keyboard height changes while the keyboard remains visible.

Prefer the library's live animation/handler value rather than its ordinary
show/hide event API if the latter only reports visibility transitions.

The value must update when:

Email keyboard
-> Password keyboard becomes taller

Store/read the CURRENT keyboard height.

Do not use React Native Keyboard.metrics() for this calculation.

==================================================
5. DERIVE KEYBOARD TOP
==================================================

Do not assume keyboard-controller exposes screenY.

Use the already measured keyboard-closed absolute window bottom:

baselineBottom

Then derive:

actualCurrentKeyboardTop =
baselineBottom - liveKeyboardHeight

Both must represent the same window coordinate space.

Do not use:

Dimensions height - keyboard height

unless inspection proves that value uses the exact same coordinate system as
measureInWindow on this edge-to-edge screen.

==================================================
6. PASSWORD CLEARANCE
==================================================

When Password receives focus:

1. restore padding to the base keyboard padding
2. let the password keyboard/inset settle
3. measure Password with measureInWindow()

passwordFieldBottom =
windowY + height

4. read the current LIVE keyboard height
5. derive:

actualCurrentKeyboardTop =
baselineBottom - liveKeyboardHeight

6. calculate:

requiredExtra =
Math.max(
  passwordFieldBottom + 16 - actualCurrentKeyboardTop,
  0
)

7. final Android padding:

baseKeyboardPadding + requiredExtra

The entire Password field, including its bottom border, must remain above the
keyboard with the 16dp safety margin.

==================================================
7. EMAIL / HIDE
==================================================

When focus returns to Email:

- remove only the password-specific extra
- restore base keyboard padding

When keyboard hides:

- password extra = 0
- base padding = 0
- total paddingBottom = 0 exactly
- keep the existing closed-layout baseline refresh

Do not allow live controller height changes during dismissal to leave residual
padding.

==================================================
8. IOS
==================================================

Do not change the current iOS KeyboardAvoidingView behavior.

This new password-specific controller calculation is Android-only unless the
existing code structure requires harmless provider presence.

==================================================
9. DO NOT CHANGE
==================================================

Do not change:

- login header flex/minHeight
- app.json keyboard configuration
- logout flow
- AuthContext
- Settings
- machine/backend files

Do not add:

- guessed keyboard-row height
- ScrollView
- translateY
- behavior="height"

==================================================
10. REPORT BEFORE BUILD
==================================================

After implementation report:

1. exact dependency/version installed
2. exact KeyboardProvider placement
3. exact controller hook/API used for live height
4. proof/explanation that its height updates while the keyboard remains open
5. how actualCurrentKeyboardTop is derived
6. password overlap formula
7. Email-focus behavior
8. keyboard-hide behavior
9. exact files changed
10. confirm nothing staged/committed/pushed

Do NOT commit.

Do NOT tell Git to stage anything.