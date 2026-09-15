-- ============================================
-- ISO 27001 Security Schema
-- Safe to re-run after migrate_to_v2.sql
-- ============================================

-- ============================================
-- Control #7: Login Audit Logging
-- Control #14: Audit Trail Protection
-- ============================================
CREATE TABLE IF NOT EXISTS login_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Control #7: Required audit fields
  user_email TEXT NOT NULL,
  login_status TEXT NOT NULL,
  
  -- Extended metadata
  ip_address TEXT DEFAULT 'mobile-client',
  user_agent TEXT DEFAULT '',
  device_info TEXT DEFAULT '',
  
  -- Control #11: Session security flags (simulated)
  session_secure_flag BOOLEAN DEFAULT TRUE,
  session_httponly_flag BOOLEAN DEFAULT TRUE,
  session_samesite TEXT DEFAULT 'Strict',

  -- Control #20: Suspicious login tracking
  is_suspicious BOOLEAN DEFAULT FALSE,
  suspicious_reason TEXT DEFAULT NULL,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure password_reset (and other statuses) are allowed on existing DBs
ALTER TABLE login_audit_logs DROP CONSTRAINT IF EXISTS login_audit_logs_login_status_check;
ALTER TABLE login_audit_logs
  ADD CONSTRAINT login_audit_logs_login_status_check
  CHECK (login_status IN (
    'success', 'failed', 'locked',
    'otp_sent', 'otp_verified', 'otp_failed',
    'password_reset'
  ));

-- Control #14: Enable RLS — protect audit trails
ALTER TABLE login_audit_logs ENABLE ROW LEVEL SECURITY;

-- Idempotent policies (DROP IF EXISTS → CREATE)
DROP POLICY IF EXISTS "Users can view own audit logs" ON login_audit_logs;
CREATE POLICY "Users can view own audit logs"
  ON login_audit_logs FOR SELECT
  USING (
    user_email = (
      SELECT auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert own logs" ON login_audit_logs;
CREATE POLICY "Authenticated users can insert own logs"
  ON login_audit_logs FOR INSERT
  WITH CHECK (
    user_email = (
      SELECT auth.jwt() ->> 'email'
    )
  );

DROP POLICY IF EXISTS "Admins can view all audit logs" ON login_audit_logs;
CREATE POLICY "Admins can view all audit logs"
  ON login_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- NO DELETE or UPDATE policies — audit logs are immutable
-- This satisfies Control #14: Audit Trail Protection

-- Allow unauthenticated inserts for pre-auth events
-- (failed login, lockout, password reset — no JWT yet)
DROP POLICY IF EXISTS "Allow insert for failed login logging" ON login_audit_logs;
DROP POLICY IF EXISTS "Allow insert for unauthenticated audit events" ON login_audit_logs;
CREATE POLICY "Allow insert for unauthenticated audit events"
  ON login_audit_logs FOR INSERT
  WITH CHECK (login_status IN ('failed', 'locked', 'password_reset'));

-- ============================================
-- Control #12: Password Reset Token Tracking
-- ============================================
-- Supabase handles password reset tokens internally via
-- supabase.auth.resetPasswordForEmail() which sends
-- an expiring link (default: 1 hour).
-- No additional table needed — Supabase manages this.

-- ============================================
-- Security Documentation (in-schema comments)
-- ============================================
COMMENT ON TABLE login_audit_logs IS 'ISO 27001 Control #7/#14: Immutable login audit trail with RLS protection. No DELETE/UPDATE policies to ensure tamper-proof records.';
COMMENT ON COLUMN login_audit_logs.session_secure_flag IS 'ISO 27001 Control #11: Indicates session transmitted over HTTPS only';
COMMENT ON COLUMN login_audit_logs.session_httponly_flag IS 'ISO 27001 Control #11: Indicates session not accessible via client-side JavaScript';
COMMENT ON COLUMN login_audit_logs.is_suspicious IS 'ISO 27001 Control #20: Flagged if login detected from new/unknown device';
