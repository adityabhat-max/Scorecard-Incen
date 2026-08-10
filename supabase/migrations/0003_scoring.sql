-- Scoring engine: applies kpi_config thresholds/weights to raw_kpi_entries.
--
-- Design note: the 7 KPI field names and 3 category names (attendance/
-- service/customer) are hardcoded here rather than fully dynamic, so adding
-- an 8th KPI would need a migration. What IS config-driven without a code
-- deploy: every threshold, every weight, category weights, and rating bands
-- — which covers the actual recalibration need called out in the source
-- doc ("Threshold Adjustments... Weight Changes... Benchmark Updates").

create or replace function public.score_single_kpi(
  p_value numeric,
  p_thresholds jsonb,
  p_direction text
)
returns numeric
language plpgsql
immutable
as $$
declare
  t jsonb;
  bound numeric;
begin
  if p_value is null then
    return null;
  end if;

  for t in select * from jsonb_array_elements(p_thresholds) loop
    if p_direction = 'higher_better' then
      bound := (t->>'min')::numeric;
      if bound is null or p_value >= bound then
        return (t->>'score')::numeric;
      end if;
    else
      bound := (t->>'max')::numeric;
      if bound is null or p_value <= bound then
        return (t->>'score')::numeric;
      end if;
    end if;
  end loop;

  return null;
end;
$$;

create or replace function public.calculate_scores(p_batch_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_location uuid;
  r record;
  cfg record;
  kpis jsonb;
  s_att_punc numeric; s_leave numeric; s_absent numeric; s_reg numeric;
  s_util numeric; s_signoff numeric; s_esc numeric;
  cat_attendance numeric; cat_service numeric; cat_customer numeric;
  final_raw numeric;
  final numeric;
  rating text;
  band jsonb;
begin
  select location_id into v_batch_location from score_batches where id = p_batch_id;
  if v_batch_location is null then
    raise exception 'batch % not found', p_batch_id;
  end if;

  if not (
    public.current_role() = 'org_level_executive'
    or (public.current_role() = 'sales_manager' and public.current_location() = v_batch_location)
  ) then
    raise exception 'not authorized to calculate scores for this batch';
  end if;

  for r in
    select rk.*, sm.profile_type
    from raw_kpi_entries rk
    join staff_members sm on sm.id = rk.staff_member_id
    where rk.batch_id = p_batch_id
      and rk.applicable = true
  loop
    select * into cfg
    from kpi_config
    where profile_type = r.profile_type
    order by effective_from desc, version desc
    limit 1;

    if not found then
      raise exception 'No kpi_config found for profile_type %', r.profile_type;
    end if;

    kpis := cfg.config->'kpis';

    s_att_punc := public.score_single_kpi(r.attendance_punctuality, kpis->'attendance_punctuality'->'thresholds', kpis->'attendance_punctuality'->>'direction');
    s_leave    := public.score_single_kpi(r.leave_pct, kpis->'leave_pct'->'thresholds', kpis->'leave_pct'->>'direction');
    s_absent   := public.score_single_kpi(r.absent_without_leave_pct, kpis->'absent_without_leave_pct'->'thresholds', kpis->'absent_without_leave_pct'->>'direction');
    s_reg      := public.score_single_kpi(r.attendance_regularization_pct, kpis->'attendance_regularization_pct'->'thresholds', kpis->'attendance_regularization_pct'->>'direction');
    s_util     := public.score_single_kpi(r.service_utilization_pct, kpis->'service_utilization_pct'->'thresholds', kpis->'service_utilization_pct'->>'direction');
    s_signoff  := public.score_single_kpi(r.signoff_missed_pct, kpis->'signoff_missed_pct'->'thresholds', kpis->'signoff_missed_pct'->>'direction');
    s_esc      := public.score_single_kpi(r.client_escalations_pct, kpis->'client_escalations_pct'->'thresholds', kpis->'client_escalations_pct'->>'direction');

    cat_attendance := round(
        s_att_punc * (kpis->'attendance_punctuality'->>'weight')::numeric
      + s_leave    * (kpis->'leave_pct'->>'weight')::numeric
      + s_absent   * (kpis->'absent_without_leave_pct'->>'weight')::numeric
      + s_reg      * (kpis->'attendance_regularization_pct'->>'weight')::numeric
    , 2);

    cat_service := round(
      s_util * (kpis->'service_utilization_pct'->>'weight')::numeric
    , 2);

    cat_customer := round(
        s_signoff * (kpis->'signoff_missed_pct'->>'weight')::numeric
      + s_esc     * (kpis->'client_escalations_pct'->>'weight')::numeric
    , 2);

    final_raw := cat_attendance * (cfg.config->'categories'->>'attendance')::numeric
               + cat_service    * (cfg.config->'categories'->>'service')::numeric
               + cat_customer   * (cfg.config->'categories'->>'customer')::numeric;
    final := round(final_raw, 0);

    -- Rating band uses the UNROUNDED score. Verified against real report
    -- data: a raw 69.8 rounds to 70 for display but the published rating
    -- was still "Needs Improvement" (the <70 band), not "Satisfactory" —
    -- banding on the rounded value gives the wrong rating right at every
    -- boundary.
    rating := null;
    for band in select * from jsonb_array_elements(cfg.config->'rating_bands') loop
      if (band->>'min') is null or final_raw >= (band->>'min')::numeric then
        rating := band->>'label';
        exit;
      end if;
    end loop;

    insert into computed_scores (
      batch_id, staff_member_id, period, kpi_scores, category_scores, final_score, rating, kpi_config_id
    )
    select
      p_batch_id,
      r.staff_member_id,
      sb.period,
      jsonb_build_object(
        'attendance_punctuality', s_att_punc,
        'leave_pct', s_leave,
        'absent_without_leave_pct', s_absent,
        'attendance_regularization_pct', s_reg,
        'service_utilization_pct', s_util,
        'signoff_missed_pct', s_signoff,
        'client_escalations_pct', s_esc
      ),
      jsonb_build_object('attendance', cat_attendance, 'service', cat_service, 'customer', cat_customer),
      final,
      rating,
      cfg.id
    from score_batches sb
    where sb.id = p_batch_id
    on conflict (batch_id, staff_member_id) do update set
      kpi_scores = excluded.kpi_scores,
      category_scores = excluded.category_scores,
      final_score = excluded.final_score,
      rating = excluded.rating,
      kpi_config_id = excluded.kpi_config_id,
      computed_at = now();
  end loop;
end;
$$;

grant execute on function public.calculate_scores(uuid) to authenticated;
