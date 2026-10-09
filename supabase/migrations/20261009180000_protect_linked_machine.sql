-- ============================================================================
-- Block normal users from setting profiles.linked_machine_id.
-- pair_machine remains the only normal path that can set a non-null link.
-- Safe to re-run. Do not edit protect_profile_role.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_linked_machine()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- pair_machine is SECURITY DEFINER, so current_user is its owner (postgres).
  -- service_role and the SQL editor can still manage the column.
  IF coalesce(auth.role(), '') IN ('service_role', 'supabase_admin')
     OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.linked_machine_id := NULL;
  ELSIF TG_OP = 'UPDATE'
    AND NEW.linked_machine_id IS DISTINCT FROM OLD.linked_machine_id
    AND NEW.linked_machine_id IS NOT NULL THEN
    NEW.linked_machine_id := OLD.linked_machine_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_linked_machine ON public.profiles;
CREATE TRIGGER protect_linked_machine
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_linked_machine();

REVOKE ALL ON FUNCTION public.protect_linked_machine() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.protect_linked_machine() TO authenticated, service_role;
