-- Row Level Security policies
-- Pattern: security-definer helper functions read the caller's own `profiles`
-- row (bypassing RLS internally, which avoids infinite recursion when a
-- policy on `profiles` itself needs to check role/location), then every
-- other table's policies call those helpers. This is the standard Supabase
-- RLS idiom — no custom JWT claims required.

create or replace function public.current_role()
returns access_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function public.current_location()
returns uuid
language sql stable security definer set search_path = public as $$
  select location_id from profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;

create policy profiles_select_self on profiles
  for select using (id = auth.uid());

create policy profiles_select_org on profiles
  for select using (public.current_role() = 'org_level_executive');

create policy profiles_org_manage on profiles
  for all using (public.current_role() = 'org_level_executive')
  with check (public.current_role() = 'org_level_executive');

-- ---------------------------------------------------------------------------
-- locations
-- ---------------------------------------------------------------------------
alter table locations enable row level security;

create policy locations_select_all on locations
  for select using (auth.role() = 'authenticated');

create policy locations_org_manage on locations
  for all using (public.current_role() = 'org_level_executive')
  with check (public.current_role() = 'org_level_executive');

-- ---------------------------------------------------------------------------
-- staff_members
-- ---------------------------------------------------------------------------
alter table staff_members enable row level security;

create policy staff_select_scope on staff_members
  for select using (
    public.current_role() = 'org_level_executive'
    or (public.current_role() = 'sales_manager' and location_id = public.current_location())
    or (public.current_role() = 'sales_executive' and login_profile_id = auth.uid())
  );

create policy staff_manage_scope on staff_members
  for all using (
    public.current_role() = 'org_level_executive'
    or (public.current_role() = 'sales_manager' and location_id = public.current_location())
  )
  with check (
    public.current_role() = 'org_level_executive'
    or (public.current_role() = 'sales_manager' and location_id = public.current_location())
  );

-- ---------------------------------------------------------------------------
-- kpi_config — readable by everyone authenticated (needed to show KPI
-- targets), writable by org only
-- ---------------------------------------------------------------------------
alter table kpi_config enable row level security;

create policy kpi_config_select_all on kpi_config
  for select using (auth.role() = 'authenticated');

create policy kpi_config_org_manage on kpi_config
  for all using (public.current_role() = 'org_level_executive')
  with check (public.current_role() = 'org_level_executive');

-- ---------------------------------------------------------------------------
-- score_batches
-- ---------------------------------------------------------------------------
alter table score_batches enable row level security;

create policy score_batches_select_scope on score_batches
  for select using (
    public.current_role() = 'org_level_executive'
    or (public.current_role() = 'sales_manager' and location_id = public.current_location())
    or (public.current_role() = 'sales_executive' and location_id = public.current_location())
  );

create policy score_batches_insert_scope on score_batches
  for insert with check (
    public.current_role() = 'org_level_executive'
    or (public.current_role() = 'sales_manager' and location_id = public.current_location())
  );

-- ---------------------------------------------------------------------------
-- raw_kpi_entries
-- ---------------------------------------------------------------------------
alter table raw_kpi_entries enable row level security;

create policy raw_kpi_select_scope on raw_kpi_entries
  for select using (
    public.current_role() = 'org_level_executive'
    or (
      public.current_role() = 'sales_manager'
      and exists (
        select 1 from staff_members sm
        where sm.id = raw_kpi_entries.staff_member_id
          and sm.location_id = public.current_location()
      )
    )
    or (
      public.current_role() = 'sales_executive'
      and exists (
        select 1 from staff_members sm
        where sm.id = raw_kpi_entries.staff_member_id
          and sm.login_profile_id = auth.uid()
      )
    )
  );

create policy raw_kpi_insert_scope on raw_kpi_entries
  for insert with check (
    public.current_role() = 'org_level_executive'
    or (
      public.current_role() = 'sales_manager'
      and exists (
        select 1 from score_batches sb
        where sb.id = raw_kpi_entries.batch_id
          and sb.location_id = public.current_location()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- computed_scores — select-only via RLS. There is deliberately no insert /
-- update policy: rows are only ever written by the SECURITY DEFINER
-- calculate_scores() function (0003_scoring.sql), never directly by a
-- client role. That keeps the calculation pipeline the single source of
-- truth for scores.
-- ---------------------------------------------------------------------------
alter table computed_scores enable row level security;

create policy computed_scores_select_scope on computed_scores
  for select using (
    public.current_role() = 'org_level_executive'
    or (
      public.current_role() = 'sales_manager'
      and exists (
        select 1 from staff_members sm
        where sm.id = computed_scores.staff_member_id
          and sm.location_id = public.current_location()
      )
    )
    or (
      public.current_role() = 'sales_executive'
      and exists (
        select 1 from staff_members sm
        where sm.id = computed_scores.staff_member_id
          and sm.login_profile_id = auth.uid()
      )
    )
  );
