# Coding Rules (RULES) - CacaoScan

The absolute programming standard for all developers and AI extensions interacting with the CacaoScan codebase. Non-compliance drastically reduces system maintainability and causes severe technical debt.

## 1. SOLID Principles Enforced
- **Single Responsibility:** React Native views should exclusively handle rendering UI. All business logic, state derivation, and Supabase interaction must be handled in custom hooks (`useAuth`, `useHardwareTelemetry`) or utility files.
- **Open/Closed:** Component architecture must be open to extension (via props or slots) but closed to modification of the interior core wrapper. (e.g. Do not rewrite a base `<Button />` component to add a specific icon; pass an `<Icon />` as a prop).
- **Dependency Inversion:** Abstractions (like the Supabase client) must be passed dynamically or imported centrally from `services/supabase.ts` instead of re-instantiating the client randomly in pages.

## 2. The DRY Method (Don't Repeat Yourself)
- If a function/logic block (e.g., formatting ISO timestamps to "May 3, 2026", calculating success rates, or executing a specific DB mutation) is instantiated 3+ times, **it must be immediately refactored**.
- Abstract generic UI elements (cards, standardized headers, warning modals) into the `components/` directory.

## 3. The KISS Method (Keep It Simple, Stupid)
- Code depth (nesting) should rarely exceed 3 levels deep. Extract early exits and guard clauses to the top of functions.
- Favor standard React Context/Zustand over highly boilerplate systems (like Redux) for managing simple cross-app state (like `AuthContext`).
- Opt for native solutions wherever possible before adding a new package to `package.json`. Every dependency adds security vulnerability vectors (as per ISO standard requirements).

## 4. Path and Typing Strictness
- **Absolute Imports:** Use Webpack/Babel absolute paths (`@/components`, `@/services`) where configured, strictly avoiding spaghetti relative paths (`../../../`).
- **TypeScript First:** All parameters, returns, and component props must define explicit Interfaces/Types. Usage of the `any` type is considered a build-breaking failure in this project.

## 5. Embedded Constraints (C++)
- **Static Allocation Only:** Any function interacting with the EloquentTinyML library must use the pre-allocated tensor_arena. No usage of new or malloc is allowed inside the loop() to prevent heap fragmentation.
- **Core Locking:** Hardware interrupts (IR Sensors) must be attached to Core 0 to ensure zero-latency pulse detection.
