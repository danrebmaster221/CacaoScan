ADDITIONAL REGISTER UI REQUIREMENT — KEYBOARD NEXT FIELD BEHAVIOR

The user clarified what they mean by "keyboard listener."

They mean the Android IME action button in the bottom-right of the keyboard
(the blue check/arrow/Next button).

When that keyboard action is pressed, focus should move to the next logical
input instead of simply dismissing the keyboard.

Implement this in register.tsx without changing registration business logic.

STEP 1:

First Name
-> keyboard action focuses Last Name

Last Name
-> keyboard action focuses Farm Location

Farm Location
-> use the appropriate final action for this step.
If Farm Location is a normal TextInput, pressing the final action should
dismiss the keyboard or perform the existing intended interaction safely.
Do not automatically submit/advance if location selection still requires a
search result selection.

STEP 2:

Email
-> keyboard action focuses Password

Password
-> keyboard action focuses Confirm Password

Confirm Password
-> returnKeyType="done"
-> dismiss keyboard
-> do NOT automatically create the account unless that is already intended

Use TextInput refs and onSubmitEditing / the appropriate React Native 0.86
TextInput APIs.

Use returnKeyType="next" for fields that have another field after them.

Use returnKeyType="done" for the final field where appropriate.

Set keyboard behavior so pressing Next does not unnecessarily dismiss the
keyboard between fields.

STEP 3 OTP:

Do not redesign the OTP behavior if it already auto-advances between digits.
Only inspect it if the keyboard action currently causes an obvious problem.

KEEP:

- KeyboardAwareScrollView registration avoidance fix
- GoogleGlyph fix
- all Auth Milestone 2 business logic
- Login keyboard code completely unchanged

This remains register.tsx only.