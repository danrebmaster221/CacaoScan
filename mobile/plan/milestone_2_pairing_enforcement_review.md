# Milestone 2 — Machine Pairing PIN Enforcement Review

## 1. Files changed by Milestone 2

- `mobile/app/settings/pairing.tsx`
- `mobile/supabase/schema_v2.sql`
- `supabase/migrations/20261009180000_protect_linked_machine.sql` (new, untracked)

## 2. git diff --stat

`20261009180000_protect_linked_machine.sql` is untracked, so it does not appear in `git diff --stat`.

```
 mobile/app/settings/pairing.tsx | 118 +++++++++++++++++++++++++++++-----------
 mobile/supabase/schema_v2.sql   | 70 ++++++++++++++++++++++++
 2 files changed, 156 insertions(+), 32 deletions(-)
```

`schema_v2.sql` is still uncommitted from Milestone 1. Those 70 lines versus HEAD include `protect_profile_role()` from Milestone 1 and `protect_linked_machine()` from Milestone 2. Milestone 2 did not edit `protect_profile_role()`.

## 3. mobile/app/settings/pairing.tsx

Paired-state loading, `handlePair`, and `handleUnpair`:

```diff
-import React, { useState } from 'react';
+import React, { useEffect, useState } from 'react';
-  const [machineId, setMachineId] = useState(meta?.paired_machine || '');
+  const [machineId, setMachineId] = useState('');
   const [masterPin, setMasterPin] = useState('');
   const [farmName, setFarmName] = useState(meta?.farm_location || 'Zamboanga Peninsula, 7000, Philippines');
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [success, setSuccess] = useState<string | null>(null);
-  const [isPaired, setIsPaired] = useState(!!meta?.paired_machine);
+  const [isPaired, setIsPaired] = useState(false);
+
+  useEffect(() => {
+    let cancelled = false;
+
+    async function loadLinkedMachine() {
+      if (!user?.id) {
+        setIsPaired(false);
+        return;
+      }
+
+      const { data, error: readError } = await supabase
+        .from('profiles')
+        .select('linked_machine_id')
+        .eq('id', user.id)
+        .single();
+
+      if (cancelled) return;
+
+      if (readError) {
+        setIsPaired(false);
+        setError('Failed to load pairing status.');
+        return;
+      }
+
+      const linkedId = data?.linked_machine_id ?? null;
+      if (linkedId) {
+        setMachineId(linkedId);
+        setIsPaired(true);
+      } else {
+        setIsPaired(false);
+      }
+    }
+
+    loadLinkedMachine();
+    return () => {
+      cancelled = true;
+    };
+  }, [user?.id]);

   const handlePair = async () => {
@@
     setError(null);
     setSuccess(null);

+    const normalizedId = machineId.trim();
+
     try {
-      // Prefer secure RPC (does not expose master_pin)
       const { data: ok, error: rpcError } = await supabase.rpc('pair_machine', {
-        p_machine_id: machineId.trim(),
+        p_machine_id: normalizedId,
         p_pin: masterPin,
       });

-      if (!rpcError && ok === true) {
-        await supabase.auth.updateUser({
-          data: {
-            ...meta,
-            paired_machine: machineId.trim().toUpperCase(),
-            farm_location: farmName.trim(),
-          },
-        });
-        setIsPaired(true);
-        setSuccess(`Successfully paired with ${machineId.trim().toUpperCase()}!`);
-        setMasterPin('');
+      if (rpcError) {
+        setError('Failed to pair machine.');
         return;
       }
+      if (ok !== true) {
+        setError('Failed to pair machine.');
+        return;
+      }

-      // Fallback: metadata-only pairing (dev / before machines seeded)
-      const { error: updateError } = await supabase.auth.updateUser({
+      setIsPaired(true);
+      setMachineId(normalizedId);
+      setSuccess(`Successfully paired with ${normalizedId}!`);
+      setMasterPin('');
+
+      const { error: metaError } = await supabase.auth.updateUser({
         data: {
           ...meta,
-          paired_machine: machineId.trim().toUpperCase(),
+          paired_machine: normalizedId,
           farm_location: farmName.trim(),
         },
       });
-      if (updateError) throw updateError;
-
-      setIsPaired(true);
-      setSuccess(`Paired with ${machineId.trim().toUpperCase()} (local claim).`);
-      setMasterPin('');
-    } catch (err: any) {
-      setError(err.message || 'Failed to pair machine.');
+      if (metaError) {
+        console.warn('Pairing metadata update failed.');
+      }
+    } catch {
+      setError('Failed to pair machine.');
     } finally {
       setLoading(false);
     }
   };

   const handleUnpair = async () => {
+    if (!user?.id) {
+      setError('Failed to unpair.');
+      return;
+    }
+
     setLoading(true);
     setError(null);
     try {
-      const { error: updateError } = await supabase.auth.updateUser({
-        data: { ...meta, paired_machine: null },
-      });
-      if (updateError) throw updateError;
+      const { error: dbError } = await supabase
+        .from('profiles')
+        .update({ linked_machine_id: null })
+        .eq('id', user.id);
+
+      if (dbError) {
+        setError('Failed to unpair.');
+        return;
+      }
+
       setIsPaired(false);
       setMachineId('');
       setSuccess('Machine unpaired successfully.');
-    } catch (err: any) {
-      setError(err.message || 'Failed to unpair.');
+
+      const { error: metaError } = await supabase.auth.updateUser({
+        data: { ...meta, paired_machine: null },
+      });
+      if (metaError) {
+        console.warn('Unpair metadata cleanup failed.');
+      }
+    } catch {
+      setError('Failed to unpair.');
     } finally {
       setLoading(false);
     }
```

## 4. mobile/supabase/schema_v2.sql

`pair_machine` was unchanged. `protect_profile_role()` was unchanged.

Milestone 2 added only:

```sql
-- Normal users cannot set a non-null linked_machine_id. pair_machine is
-- SECURITY DEFINER, so current_user inside that UPDATE is the function owner
-- (postgres) and this SECURITY INVOKER trigger allows the write.
CREATE OR REPLACE FUNCTION public.protect_linked_machine()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
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
```

## 5. supabase/migrations/20261009180000_protect_linked_machine.sql

```sql
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
```

## 6. Migration status

Read-only `supabase migration list --linked`. No push, repair, or SQL was run.

| Local | Remote |
| --- | --- |
| `20261009170000` | `20261009170000` |
| `20261009180000` | not applied |

`20261009180000_protect_linked_machine.sql` is the only pending migration. `supabase db push` would apply that file and would not re-apply `20261009170000`.

Git has not committed `supabase/migrations/`. The whole directory is untracked, including the already-applied `20261009170000_harden_profile_role.sql` and the pending `20261009180000_protect_linked_machine.sql`.
