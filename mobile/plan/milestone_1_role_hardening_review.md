# Milestone 1 — Role Authorization Hardening Review

## Files changed by this milestone

- `mobile/context/AuthContext.tsx`
- `mobile/supabase/schema_v2.sql`
- `mobile/supabase/harden_profile_role.sql` (new, untracked)

## git diff --stat

`harden_profile_role.sql` is untracked, so it does not appear in `git diff --stat`.

```
 mobile/context/AuthContext.tsx | 34 +++++++++++++++++++++-------------
 mobile/supabase/schema_v2.sql  | 34 ++++++++++++++++++++++++++++++++++
 2 files changed, 55 insertions(+), 13 deletions(-)
```

## 1. mobile/context/AuthContext.tsx — fetchUserRole

```diff
   async function fetchUserRole(userId: string) {
     try {
-      // Primary source: auth user_metadata (always works, no RLS issues)
+      // Names may still come from metadata. Role never does.
       const { data: { user: freshUser } } = await supabase.auth.getUser();
       const meta = freshUser?.user_metadata;

+      const { data, error } = await supabase
+        .from('profiles')
+        .select('role, first_name, last_name, farm_location')
+        .eq('id', userId)
+        .single();
+
+      const trustedRole: UserRole =
+        !error && (data?.role === 'admin' || data?.role === 'farmer')
+          ? data.role
+          : 'farmer';
+
       if (meta?.first_name && meta?.last_name && meta?.farm_location) {
-        setUserRole((meta.role as UserRole) ?? 'farmer');
+        setUserRole(trustedRole);
         setUserProfile({
-          role: (meta.role as UserRole) ?? 'farmer',
+          role: trustedRole,
           first_name: meta.first_name,
           last_name: meta.last_name,
           farm_location: meta.farm_location,
         });
         return;
       }

-      // Fallback: profiles table (may fail due to RLS)
-      const { data, error } = await supabase
-        .from('profiles')
-        .select('role, first_name, last_name, farm_location')
-        .eq('id', userId)
-        .single();
-
       if (!error && data?.first_name) {
-        setUserRole((data.role as UserRole) ?? 'farmer');
-        setUserProfile(data as UserProfile);
+        setUserRole(trustedRole);
+        setUserProfile({
+          role: trustedRole,
+          first_name: data.first_name,
+          last_name: data.last_name,
+          farm_location: data.farm_location,
+        });
         return;
       }

-      // No profile data found anywhere
       console.warn('No profile data found in metadata or profiles table.');
       setUserRole('farmer');
       setUserProfile(null);
```

## 2. mobile/supabase/schema_v2.sql — protect_profile_role and trigger

```diff
+-- Normal users cannot change profiles.role. SECURITY INVOKER so current_user
+-- stays the caller. A SECURITY DEFINER function would run as the owner and
+-- would allow every user to set role.
+CREATE OR REPLACE FUNCTION public.protect_profile_role()
+RETURNS TRIGGER
+LANGUAGE plpgsql
+SECURITY INVOKER
+SET search_path = public
+AS $$
+BEGIN
+  IF coalesce(auth.role(), '') IN ('service_role', 'supabase_admin')
+     OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
+    RETURN NEW;
+  END IF;
+
+  IF TG_OP = 'INSERT' THEN
+    NEW.role := 'farmer';
+  ELSIF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
+    NEW.role := OLD.role;
+  END IF;
+
+  RETURN NEW;
+END;
+$$;
+
+DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
+CREATE TRIGGER protect_profile_role
+  BEFORE INSERT OR UPDATE ON public.profiles
+  FOR EACH ROW
+  EXECUTE FUNCTION public.protect_profile_role();
+
+REVOKE ALL ON FUNCTION public.protect_profile_role() FROM PUBLIC;
+GRANT EXECUTE ON FUNCTION public.protect_profile_role() TO authenticated, service_role;
```

## 3. mobile/supabase/harden_profile_role.sql

```sql
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
```
