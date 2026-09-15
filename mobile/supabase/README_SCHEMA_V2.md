# CacaoScan Supabase Schema v2

## Which file to run

| Situation | Run in Supabase SQL Editor |
| --- | --- |
| **Existing project** (has variety/quality tables) | `migrate_to_v2.sql` → then re-run `security-schema.sql` |
| **Fresh empty project** | `schema_v2.sql` → then `security-schema.sql` |
| Legacy `schema.sql` / `shema_version2.sql` | Do **not** run — superseded |

## What changed

- Dual Model A/B (`variety` + `quality`) → single `operational_class`
- Classes (exact): `Rejected`, `Needs_Drying`, `Criollo`, `Forastero`, `Trinitario`
- `gate_actuated` 1–5 → 36 / 42 / 48 / 54 / 60 cm
- Removed `is_flagged`, `farmer_correction`
- `batches.machine_id` + generated `export_grade_count` / `total_beans`
- `machines.master_pin` hidden from clients; use `pair_machine(id, pin)` RPC
- Trigger bumps batch counters on classification insert
- Edge/Python inserts must use **service_role** key (RLS bypass)

## After migration

1. Confirm app inserts use `operational_class`, `confidence`, `gate_actuated`, `derived_grade`
2. Drop legacy when ready: `DROP TABLE classifications_legacy_v1;`
3. Restart Expo + mock ESP32 (`node scripts/mock-esp32.js`)

### Common error: `column "created_at" of relation "machines" does not exist`

Your project already had a `machines` table without v2 columns. `CREATE TABLE IF NOT EXISTS`
skips creation, so the grant on `created_at` failed. Current `migrate_to_v2.sql` adds
missing columns with `ALTER TABLE … ADD COLUMN IF NOT EXISTS` — re-run the full script.