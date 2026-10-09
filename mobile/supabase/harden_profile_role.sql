-- ============================================================================
-- Harden profiles.role (existing projects)
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- Do not re-run schema_v2.sql on a live database.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- SQL editor (postgres) and service_role may set role on purpose.
  -- Triggers still fire for service_role; RLS bypass does not skip them.
  IF coalesce(auth.role(), '') IN ('service_role', 'supabase_admin')
     OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'farmer';
  ELSIF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.role := OLD.role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
CREATE TRIGGER protect_profile_role
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

REVOKE ALL ON FUNCTION public.protect_profile_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_profile_role() TO authenticated, service_role;
