# CacaoScan — ISO 27001 Security Documentation

> **ISO/IEC 27001:2022 Annex A** — Information Security Controls
> Applied to the CacaoScan Mobile Authentication System

---

## 1. Unique User Accounts (A.9.2.1)
**Implementation**: Supabase `auth.users` table enforces unique email addresses. Each user has a UUID primary key.
**Files**: `context/AuthContext.tsx`, `supabase/schema.sql`

## 2. Strong Password Policy (A.9.4.3)
**Implementation**: Client-side validation requiring ≥12 characters, uppercase, lowercase, number, and special character. Live strength meter on registration.
**Files**: `utils/password-validator.ts`, `app/(auth)/register.tsx`

## 3. Password Hashing (A.10.1.1)
**Implementation**: Supabase uses **bcrypt** with salt rounds for all stored passwords. Plaintext passwords are never stored or logged.
**Provider**: Supabase Auth (server-side)

## 4. Multi-Factor Authentication (A.9.4.2)
**Implementation**: After password verification, a 6-digit OTP is sent to the user's registered email via `supabase.auth.signInWithOtp()`. OTP expires after 5 minutes.
**Files**: `context/AuthContext.tsx`, `app/(auth)/verify-otp.tsx`

## 5. HTTPS/TLS Enforcement (A.14.1.2)
**Implementation**: All Supabase API calls use HTTPS (`https://webiykmzhjemcfksixmx.supabase.co`). Visual TLS indicator displayed on login and registration screens.
**Files**: `app/(auth)/login.tsx`, `app/(auth)/register.tsx`

## 6. Failed Login Attempt Protection (A.9.4.2)
**Implementation**: Maximum 5 failed attempts tracked in AsyncStorage. After 5 failures, account locks for 15 minutes with visible countdown.
**Files**: `utils/security.ts`, `app/(auth)/login.tsx`

## 7. Login Audit Logging (A.12.4.1)
**Implementation**: `login_audit_logs` table records: email, status (success/failed/locked/otp_sent/otp_verified), device info, timestamp, and suspicious login flags.
**Files**: `supabase/security-schema.sql`, `context/AuthContext.tsx`

## 8. Generic Error Messages (A.9.4.2)
**Implementation**: All authentication errors display `"Invalid username or password"`. No indication whether the email or password was incorrect.
**Files**: `context/AuthContext.tsx`, `app/(auth)/login.tsx`

## 9. Session Timeout (A.11.2.8)
**Implementation**: AppState listener tracks inactivity. Sessions automatically terminate after 15 minutes of background inactivity, requiring re-authentication.
**Files**: `utils/security.ts`, `context/AuthContext.tsx`

## 10. Secure Session IDs (A.14.1.2)
**Implementation**: Supabase issues JWT tokens with random `jti` (JWT ID) claims. Tokens include expiration and are cryptographically signed.
**Provider**: Supabase Auth (server-side)

## 11. Session Hijacking Protection (A.14.1.3)
**Implementation**: Simulated secure cookie flags documented in session metadata: `Secure=true`, `HttpOnly=true`, `SameSite=Strict`. In React Native, sessions use encrypted AsyncStorage.
**Files**: `utils/security.ts`, `supabase/security-schema.sql`

## 12. Password Reset Security (A.9.2.4)
**Implementation**: `supabase.auth.resetPasswordForEmail()` sends expiring reset links (1 hour). Generic success message prevents email enumeration.
**Files**: `app/(auth)/forgot-password.tsx`, `context/AuthContext.tsx`

## 13. Least Privilege (A.9.1.2)
**Role Matrix**:

| Role | Dashboard | AI Vision | History | Settings | Manual Override | Audit Logs |
|------|-----------|-----------|---------|----------|-----------------|------------|
| farmer | ✅ Own data | ✅ | ✅ Own batches | ✅ Own profile | ✅ | ❌ |
| admin | ✅ All data | ✅ | ✅ All batches | ✅ All profiles | ✅ | ✅ |

**Files**: `supabase/schema.sql` (RLS policies), `context/AuthContext.tsx`

## 14. Audit Trail Protection (A.12.4.2)
**Implementation**: `login_audit_logs` table has RLS with NO DELETE or UPDATE policies. Records are immutable. Farmers see only own logs; admins see all.
**Files**: `supabase/security-schema.sql`

## 15. SQL Injection Protection (A.14.2.5)
**Implementation**: Supabase JS library uses PostgREST which exclusively uses **parameterized queries**. No raw SQL is executed from the client.
**Provider**: Supabase PostgREST, `utils/security.ts` (input validation)

## 16. XSS Protection (A.14.2.5)
**Implementation**: React Native auto-escapes content in JSX. Additional defense-in-depth via `sanitizeInput()` which escapes `<`, `>`, `"`, `'`, `/`, `\`.
**Files**: `utils/security.ts`, `app/(auth)/login.tsx`, `app/(auth)/register.tsx`

## 17. CSRF Protection (A.14.2.5)
**Implementation**: Random 64-character CSRF token generated per session via `getOrCreateCSRFToken()`. Token stored in AsyncStorage and attached to form submissions.
**Files**: `utils/security.ts`, `app/(auth)/login.tsx`

## 18. Brute Force Protection (A.9.4.2)
**Implementation**: Combined with Control #6. Account lockout after 5 failed attempts for 15 minutes. Lockout persisted in AsyncStorage across app restarts.
**Files**: `utils/security.ts`, `context/AuthContext.tsx`

## 19. Encryption at Rest (A.10.1.1)
**Implementation**: Supabase encrypts database volumes using **AES-256** at rest. User credentials are never stored in plaintext.
**Provider**: Supabase Infrastructure (AWS)

## 20. Suspicious Login Notification (A.16.1.2)
**Implementation**: Device fingerprint (`Platform.OS-Version`) tracked. Users receive in-app alerts when login detected from a previously unknown device.
**Files**: `utils/security.ts`, `context/AuthContext.tsx`

## 21. Security Testing Documentation (A.14.2.8)
**Tests Performed**:
- ✅ Password validator rejects all passwords below 12 chars, missing uppercase/lowercase/number/special
- ✅ Account locks correctly after 5 failed attempts
- ✅ Lockout countdown displays and resets accurately
- ✅ OTP screen requires valid 6-digit code
- ✅ Generic error messages contain no credential specifics
- ✅ Session timeout fires after inactivity period
- ✅ Audit logs are created for all login events
- ✅ RLS prevents cross-user data access
- ✅ Input sanitization removes all script injection characters

## 22. Access Control Policy (A.9.1.1)
**Policy**: CacaoScan implements role-based access control (RBAC) with two roles:
- **farmer**: Default role. Access limited to own data via Supabase RLS policies.
- **admin**: Elevated role. Can view all user data, audit logs, and manage system settings.

All database tables use Row Level Security. No cross-tenant data access is possible without admin privileges.
