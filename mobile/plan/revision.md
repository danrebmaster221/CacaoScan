IMPLEMENT APPROVED AUTH MILESTONE 2B — handle_new_user SEARCH_PATH HARDENING

Do not stage.
Do not commit.
Do not push.

Implement exactly:

handle_new_user_search_path_a3ea2312.plan.md

Modify only:

- mobile/supabase/schema_v2.sql
- one new migration:
  supabase/migrations/20261010170000_handle_new_user_search_path.sql

==================================================
MIGRATION
==================================================

Use CREATE OR REPLACE FUNCTION:

public.handle_new_user()

Keep:

- RETURNS TRIGGER
- LANGUAGE plpgsql
- SECURITY DEFINER

Add:

SET search_path = public

Preserve the function body behavior exactly:

- insert into public.profiles
- id = NEW.id
- first_name from raw_user_meta_data
- last_name from raw_user_meta_data
- farm_location from raw_user_meta_data
- missing farm location defaults to Zamboanga City
- role hardcoded to farmer
- linked_machine_id omitted/null
- RETURN NEW

Do not add any new logic.

==================================================
TRIGGER
==================================================

Do NOT drop/recreate the live:

on_auth_user_created

trigger in the migration.

CREATE OR REPLACE must preserve the existing trigger attachment.

schema_v2.sql may keep its existing trigger creation block because it is the
fresh-install schema.

==================================================
DO NOT TOUCH
==================================================

Do not modify:

- protect_profile_role
- protect_linked_machine
- pair_machine
- profile RLS
- registration UI
- AuthContext
- login
- OTP logic
- any existing profile rows

Do not add:
- GRANT
- REVOKE
- UPDATE
- DELETE
- TRUNCATE

==================================================
AFTER IMPLEMENTATION REPORT
==================================================

Return:

1. exact migration filename
2. exact function change in the migration
3. exact schema_v2.sql change
4. confirm function remains SECURITY DEFINER
5. confirm SET search_path = public
6. confirm public.profiles remains schema-qualified
7. confirm no trigger was recreated in the migration
8. confirm no role/pairing/RLS logic changed
9. confirm nothing staged/committed/pushed