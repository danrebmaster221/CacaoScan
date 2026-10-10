IMPLEMENT APPROVED FAST EMAIL -> PASSWORD CLEARANCE FIX

Do not stage.
Do not commit.
Do not push.

Implement:

password_row_still_covered_799a9aa7.plan(2).md

Modify ONLY:

mobile/app/(auth)/login.tsx

==================================================
1. FIRST KEYBOARD FRAME
==================================================

On the first keyboardDidShow of an Android keyboard-open session, store:

- firstScreenY
- firstHeight = event.endCoordinates.height
- basePadding = baselineBottom - firstScreenY

This first frame is the Email/opening keyboard reference.

Do not replace these first-frame values with controller data.

==================================================
2. REPEAT keyboardDidShow
==================================================

If React Native emits another keyboardDidShow while the SAME keyboard session
remains open:

newHeight = event.endCoordinates.height

derive from the SAME first frame:

growth = newHeight - firstHeight

keyboardTop =
firstScreenY - growth

basePadding =
baselineBottom - keyboardTop

Important:

Do NOT trust repeat-event screenY directly unless current logic explicitly
proves it moved correctly.

Use the first screenY + RN height delta.

Do NOT increment basePadding cumulatively.

Always derive from the original first frame so:

Password taller -> padding increases
Email shorter again -> padding can decrease

==================================================
3. FAST EMAIL -> PASSWORD
==================================================

If Password is focused before the first keyboard-controller onEnd:

- do NOT cancel the keyboard session
- do NOT invent coordinateGap
- do NOT combine Email basePadding with a later Password controller height

Remain on the initial basePadding until RN emits the repeat show with the
changed IME height.

Then update basePadding using the first-frame height delta and remeasure
Password.

==================================================
4. CONTROLLER coordinateGap
==================================================

Keep coordinateGap only when it can be validly established from a settled
controller height that belongs to the initial keyboard frame before Password
changes it.

If that valid calibration exists:

- keep using live controller height for later in-place adjustments

If it does not exist:

- do not fabricate it
- rely on the RN repeat keyboardDidShow height delta path

Clear it on keyboard hide.

==================================================
5. HEADER MUST YIELD WHILE KEYBOARD IS OPEN
==================================================

This is critical.

Closed keyboard / paddingBottom === 0:

keep the existing normal header exactly:

- flexGrow: 1
- flexShrink: 0
- minHeight: HEADER_MIN

Android keyboard open / paddingBottom > 0:

allow the header to yield:

- flexShrink: 1
- minHeight: 0

Do not leave HEADER_MIN active while the keyboard is open.

This ensures additional keyboard padding moves the card upward instead of
clipping the white card from the bottom.

Do not change the normal closed-screen design.

==================================================
6. PASSWORD EXTRA
==================================================

Keep passwordExtra separate from basePadding.

Measure Password with measureInWindow.

Because its measured position already contains the current passwordExtra:

basePositionPasswordBottom =
measuredPasswordBottom + currentPasswordExtra

desiredPasswordExtra =
Math.max(
  basePositionPasswordBottom
  + 16
  - actualCurrentKeyboardTop,
  0
)

paddingBottom =
basePadding + desiredPasswordExtra

Do not accumulate overlap repeatedly.

==================================================
7. EMAIL FOCUS
==================================================

If focus returns to Email:

passwordExtra = 0

Keep the current appropriate basePadding for the current keyboard frame.

If RN reports the keyboard becoming shorter again, recompute basePadding from:

firstScreenY
firstHeight
newHeight

Do not leave the taller Password padding active.

==================================================
8. KEYBOARD HIDE
==================================================

On hide:

- cancel pending Password measurements
- passwordExtra = 0
- basePadding = 0
- paddingBottom = 0 exactly
- clear firstScreenY
- clear firstHeight
- clear coordinateGap
- mark keyboard closed
- restore normal header style automatically
- refresh closed baseline after zero-padding layout commits

The login screen after dismissal must remain identical to its original layout.

==================================================
9. DO NOT TOUCH
==================================================

Do not modify:

- _layout.tsx
- KeyboardProvider
- Settings
- AuthContext
- app.json
- iOS behavior
- logout
- routing

No:
- guessed row height
- ScrollView
- translateY
- behavior="height"

==================================================
RETURN AFTER IMPLEMENTATION
==================================================

Report:

1. first-frame values stored
2. repeat keyboardDidShow delta formula
3. fast Email -> Password behavior
4. controller calibration behavior
5. exact keyboard-open header style
6. exact closed header style
7. Password extra formula
8. Email-return behavior
9. hide/reset behavior
10. confirm login.tsx only changed
11. confirm nothing staged/committed/pushed