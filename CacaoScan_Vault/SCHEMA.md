# Database Schema (SCHEMA) - CacaoScan

This document details the PostgreSQL architecture hosted on Supabase, establishing strict access models compliant with ISO 27001 requirements.

## 1. Database Schema
- **`tblprofiles`**: User metadata mapped directly from Supabase Auth via triggers.
  - `id` (UUID, PK), `first_name` (TXT), `last_name` (TXT), `farm_location` (TXT), `role` (TXT: Admin/Farmer), `contact_number` (TXT), `linked_machine_id` (FK), `created_at` (TZ).
- **`tblmachines`**: Hardware authentication and telemetry tracking.
  - `machine_id` (TXT, PK), `master_pin` (TXT), `owner_id` (UUID, FK), `is_online` (BOOL), `last_heartbeat` (TZ).
- **`tblbatches`**: Sessions aggregating classification logs.
  - `id` (UUID, PK), `user_id` (UUID, FK), `batch_name` (TXT), `status` (TXT: active/completed). Counter columns for each class (criollo, forastero, trinitario, export_grade, needs_drying, rejected), `total_beans` (INT), `completed_at` (TZ).
- **`tblclassifications`**: Individual bean AI metadata.
  - `id` (UUID, PK), `batch_id` (UUID, FK), `variety` (TXT), `variety_confidence` (REAL), `quality` (TXT), `quality_confidence` (REAL), `image_url` (TXT), `is_flagged` (BOOL), `farmer_correction` (TXT).
- **`tblloginauditlogs`**: ISO 27001 security compliance tracking.
  - `id` (UUID, PK), `user_email` (TXT), `login_status` (TXT), `ip_address` (TXT), `device_info` (TXT), `is_suspicious` (BOOL), `created_at` (TZ).
- **`tblmachine_configs`**: Stores physical calibration parameters for the continuous-stream timing algorithms.
  - `id` (UUID, PK), `machine_id` (TXT, FK), `belt_speed_cm_s` (REAL), `bin_1_distance_cm` (REAL), `bin_2_distance_cm` (REAL), `bin_3_distance_cm` (REAL), `bin_4_distance_cm` (REAL), `bin_5_distance_cm` (REAL), `updated_at` (TZ).
  - **ADD: `config_version` (INT)** — The ESP32 checks this number. If it increases, it pulls the new distances/speeds.
  - **ADD: `ejection_pulse_ms` (INT)** — How long the SG90 paddle stays extended (Default: 300ms).

## 2. Entity-Relationship Diagram (ERD)
- `tblprofiles` (1) ---> (M) `tblbatches`
- `tblprofiles` (1) ---> (1) `tblmachines`
- `tblmachines` (1) ---> (1) `tblmachine_configs`
- `tblbatches` (1) ---> (M) `tblclassifications`

## 3. Row-Level Security (RLS) Policies
Data privacy and strict authorization are enforced at the database level:
- **Profiles:** Users can only `SELECT` and `UPDATE` their **own** UUID row (`auth.uid() = id`).
- **Batches & Classifications:** Farmers can only `SELECT` or `INSERT` records where `user_id` matches their own UUID.
- **Admin Override:** Users with `role = 'Admin'` in their profile token can `SELECT` all rows globally across all tables.
- **Audit Logs:** Insert-only by the application API. Only Admins can `SELECT`.

## 4. Migrations
- Schema modifications will exclusively occur via Supabase SQL Editor and executed locally via the Supabase CLI (`supabase db diff` and `supabase db push`).
- Direct client-level SQL modifications are prohibited.
