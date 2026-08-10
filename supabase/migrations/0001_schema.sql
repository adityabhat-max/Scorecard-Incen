-- Isaac Wellness Staff Scorecard — core schema
-- Access hierarchy: org_level_executive (all) -> sales_manager (own location) -> sales_executive (own record only)
-- Scored profile types (independent of access role): therapist, doctor, salon

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Locations (real centers: Vasant Vihar, Greater Kailash, Khan Market, Noida,
-- Gurugram, Mumbai, Bangalore, Hyderabad — no region tier, org sees all directly)
-- ---------------------------------------------------------------------------
create table locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profiles: one row per authenticated login, drives RLS scope
-- ---------------------------------------------------------------------------
create type access_role as enum ('org_level_executive', 'sales_manager', 'sales_executive');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role access_role not null,
  -- set for sales_manager (their one location) and sales_executive (their own location);
  -- null for org_level_executive, who sees every location
  location_id uuid references locations (id),
  created_at timestamptz not null default now(),
  constraint sales_manager_needs_location
    check (role <> 'sales_manager' or location_id is not null),
  constraint sales_executive_needs_location
    check (role <> 'sales_executive' or location_id is not null)
);

-- ---------------------------------------------------------------------------
-- Staff members: the people being scored. Distinct from `profiles` — a staff
-- member may or may not have a login (login_profile_id links them to their
-- own sales_executive account once one exists).
-- ---------------------------------------------------------------------------
create type staff_profile_type as enum ('therapist', 'doctor', 'salon');

create table staff_members (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations (id),
  profile_type staff_profile_type not null,
  full_name text not null,
  employee_code text unique, -- e.g. "ISAAC/BLR/051" (the "Isaac ID" from the source Excel)
  login_profile_id uuid references profiles (id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index staff_members_location_idx on staff_members (location_id);
create unique index staff_members_login_profile_idx on staff_members (login_profile_id)
  where login_profile_id is not null;

-- ---------------------------------------------------------------------------
-- KPI config: versioned weights/thresholds per profile_type, so scoring rules
-- can change without a code deploy and stay auditable (per the source doc's
-- own "Configuration Updates / Version Control" guidance — this formula has
-- already been corrected once).
-- ---------------------------------------------------------------------------
create table kpi_config (
  id uuid primary key default gen_random_uuid(),
  profile_type staff_profile_type not null,
  version int not null,
  effective_from date not null,
  -- confirmed=false marks configs that reuse Therapist defaults for a profile
  -- type whose real formula hasn't been calibrated yet (currently: doctor)
  confirmed boolean not null default true,
  config jsonb not null,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  unique (profile_type, version)
);

-- ---------------------------------------------------------------------------
-- Score batches: one per monthly upload
-- ---------------------------------------------------------------------------
create table score_batches (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations (id),
  period date not null, -- first-of-month
  uploaded_by uuid not null references profiles (id),
  source_filename text,
  uploaded_at timestamptz not null default now(),
  unique (location_id, period)
);

-- ---------------------------------------------------------------------------
-- Raw KPI entries: one per staff member per batch. `signoff_missed_pct` is
-- the generalized column — Missed Signatures for therapist/salon, Prescription
-- sign-missed ratio for doctor (mapped at import time based on profile_type).
-- Values are percentages 0-100 (Attendance Punctuality can exceed 100).
-- ---------------------------------------------------------------------------
create table raw_kpi_entries (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references score_batches (id) on delete cascade,
  staff_member_id uuid not null references staff_members (id),
  applicable boolean not null default true,
  attendance_punctuality numeric,
  leave_pct numeric,
  absent_without_leave_pct numeric,
  attendance_regularization_pct numeric,
  service_utilization_pct numeric,
  signoff_missed_pct numeric,
  client_escalations_pct numeric,
  created_at timestamptz not null default now(),
  unique (batch_id, staff_member_id)
);

-- ---------------------------------------------------------------------------
-- Computed scores: immutable per-period snapshot (enables trend charts)
-- ---------------------------------------------------------------------------
create table computed_scores (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references score_batches (id) on delete cascade,
  staff_member_id uuid not null references staff_members (id),
  period date not null,
  kpi_scores jsonb not null,
  category_scores jsonb not null,
  final_score numeric not null,
  rating text not null,
  kpi_config_id uuid not null references kpi_config (id),
  computed_at timestamptz not null default now(),
  unique (batch_id, staff_member_id)
);

create index computed_scores_staff_period_idx on computed_scores (staff_member_id, period);
