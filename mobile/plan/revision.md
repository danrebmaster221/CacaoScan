PREPARE MANUAL COMMIT PLAN — READ ONLY

IMPORTANT:
Do NOT modify any file.
Do NOT stage anything.
Do NOT run git add.
Do NOT run git restore.
Do NOT run git checkout.
Do NOT run git commit.
Do NOT run git push.
Do NOT modify Git configuration.
Do NOT create commit messages automatically in Git.

I will manually perform all Git staging and commits myself.

Inspect the current working tree and prepare instructions for me only.

We want three clean commits.

COMMIT 1 — ROLE AUTHORIZATION HARDENING

Include:
- mobile/context/AuthContext.tsx
- mobile/supabase/harden_profile_role.sql
- supabase/migrations/20261009170000_harden_profile_role.sql
- mobile/scripts/verify-role-hardening.mjs
- ONLY the role-protection portion of mobile/supabase/schema_v2.sql

COMMIT 2 — MACHINE PAIRING HARDENING

Include:
- mobile/app/settings/pairing.tsx
- supabase/migrations/20261009180000_protect_linked_machine.sql
- mobile/scripts/verify-pairing-hardening.mjs
- ONLY the linked-machine protection portion of mobile/supabase/schema_v2.sql

COMMIT 3 — CONTROLLER / EDGE IDENTITY, DISCOVERY, TIMEOUTS, IR LATCH

Include validated changes from:
- firmware/models/ver_1/CacaoScan_AI.ino
- Cacao_Server/edge_server.py

Include:
- MACHINE_ID
- CACAO_MACHINE_ID
- /health identity
- /trigger machine_id validation
- mDNS
- verified edge-address handling
- NVS verified fallback/update
- health timeout fix
- trigger timeout fix
- automatic recovery
- IR1/IR2 latch and re-arm

EXCLUDE:
- firmware default-IP change to 192.168.1.70
- CAMERA_INDEX = 1

LEAVE OUT OF ALL THREE COMMITS:
- mobile/context/ESP32Context.tsx
- mobile/app/settings/hardware.tsx
- mobile/package-lock.json
- package-lock.json
- mobile/plan/
- supabase/config.toml
- supabase/.temp/

RETURN ONLY:

1. Exact commands that I should manually type
2. Which files require git add -p
3. For every git add -p section, explain which hunks I should answer:
   y = include
   n = exclude
   s = split
4. Recommended commit message for each commit
5. Expected git status after each commit
6. Confirm you performed NO Git-changing command