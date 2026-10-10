FINAL CLEANUP — LOGIN PERFORMANCE DIAGNOSTICS

The permanent Login performance fix has now PASSED physical Android testing.

Measured results:

BEFORE:
- Login render → mount/layout ≈ 5.0–5.6 seconds
- header-background ≈ 3.8–4.2 seconds
- one keyboard hide could trigger 4–5 callbacks

AFTER:
- return-to-Login render → layout ≈ 393–418 ms
- cold Login render → layout ≈ 595 ms
- header-background ≈ 103–137 ms
- keyboard listeners now subscribe/unsubscribe with screen focus
- one keyboard hide produces one HIDE callback
- physical navigation now feels significantly faster

The optimization is CONFIRMED.

Do not stage.
Do not commit.
Do not push.

==================================================
KEEP PERMANENTLY
==================================================

KEEP the optimized FibrousGrain implementation:

- SVG Pattern
- 32x32 deterministic tile
- 8 grain ellipses
- one Rect
- no Math.random()
- no thousands-of-node screen grid

KEEP:

- PodHuskRidges
- PodSegmentBands
- gradient
- logo
- CacaoSeedConveyorBelt

KEEP Login keyboard listeners scoped with useFocusEffect:

- subscribe when Login is focused
- unsubscribe on blur/unmount

KEEP all existing keyboard callback logic unchanged.

KEEP auth stack:

animation: 'none'

The physical result is now faster and the user prefers the immediate
navigation behavior.

==================================================
REMOVE ALL TEMPORARY PERFORMANCE DIAGNOSTICS
==================================================

Remove every temporary AUTH_NAV performance log and profiler.

From login.tsx remove:

- AUTH_NAV login RENDER_START
- AUTH_NAV login LAYOUT_EFFECT
- AUTH_NAV login FIRST_LAYOUT
- AUTH_NAV login PASSIVE_EFFECT

Remove React.Profiler wrappers/logging for:

- header-background
- conveyor
- form
- oauth

Remove temporary keyboard diagnostic logs:

- AUTH_NAV keyboard SUBSCRIBE
- AUTH_NAV keyboard UNSUBSCRIBE
- AUTH_NAV keyboard HIDE

IMPORTANT:

Remove ONLY the logs.

Keep the actual focus-scoped keyboard subscriptions and cleanup.

==================================================
REMOVE UNUSED DIAGNOSTIC CODE
==================================================

Remove any imports used only for diagnostics, such as:

- Profiler
- useLayoutEffect

ONLY if no longer used by real functionality.

Remove any remaining temporary timing helpers/constants.

Verify there is no:

LOGIN_PERF_ISOLATION
noHusk
noConveyor
noLogo
omitGrain
performance.now()
AUTH_NAV

left anywhere from this investigation.

==================================================
DO NOT CHANGE
==================================================

Do not alter:

- optimized grain appearance
- Login keyboard math
- Login design
- conveyor
- logo
- lockout
- pending signup
- AuthContext
- PKCE
- passwordRecovery
- recovery marker
- registration
- forgot/reset password logic
- profilePhase
- Stack.Protected
- ESP32 logic
- dependencies

==================================================
VERIFY
==================================================

After cleanup:

1. Search project for:
   AUTH_NAV
   LOGIN_PERF_ISOLATION

   Expected:
   no temporary diagnostic occurrences.

2. Ensure TypeScript/build has no unused diagnostic imports.

3. Confirm auth stack still uses:
   animation: 'none'

4. Confirm FibrousGrain still uses the optimized SVG Pattern.

5. Confirm Login keyboard listeners still use focus-scoped cleanup.

==================================================
RETURN
==================================================

Report:

1. diagnostics removed
2. profiler wrappers removed
3. unused diagnostic imports removed
4. optimized grain retained
5. focus-scoped keyboard listeners retained
6. auth animation none retained
7. exact files changed by cleanup
8. confirm auth behavior untouched
9. confirm nothing staged/committed/pushed