-- Default KPI configs, seeded from the verified Therapist formula
-- (Threpist KPI derivation program.docx, cross-checked against real pptx output).
--
-- Salon: raw data confirmed to have the identical 7-field shape as Therapist
-- -> reuses the Therapist config as-is, confirmed = true.
--
-- Doctor: substitutes `signoff_missed_pct` = Prescription-sign-missed-ratio
-- (confirmed same direction: higher = worse) in place of Missed Signatures,
-- but no doctor-specific weights/thresholds exist yet, so this is a straight
-- copy of the Therapist config with confirmed = false. Real doctor raw
-- values for attendance_regularization_pct run far higher than therapists'
-- (40-65% observed vs therapists' typical <15%), so doctor ratings will
-- likely skew low until this gets recalibrated with real thresholds.

insert into kpi_config (profile_type, version, effective_from, confirmed, config)
values (
  'therapist',
  1,
  '2025-01-01',
  true,
  '{
    "categories": { "attendance": 0.30, "service": 0.30, "customer": 0.40 },
    "kpis": {
      "attendance_punctuality": {
        "category": "attendance", "weight": 0.35, "direction": "higher_better",
        "thresholds": [
          { "min": 95, "score": 100 },
          { "min": 90, "score": 80 },
          { "min": 85, "score": 60 },
          { "min": 80, "score": 40 },
          { "min": null, "score": 20 }
        ]
      },
      "leave_pct": {
        "category": "attendance", "weight": 0.25, "direction": "lower_better",
        "thresholds": [
          { "max": 3, "score": 100 },
          { "max": 6, "score": 80 },
          { "max": 9, "score": 60 },
          { "max": 15, "score": 40 },
          { "max": null, "score": 20 }
        ]
      },
      "absent_without_leave_pct": {
        "category": "attendance", "weight": 0.20, "direction": "lower_better",
        "thresholds": [
          { "max": 0, "score": 100 },
          { "max": 2, "score": 60 },
          { "max": 5, "score": 40 },
          { "max": null, "score": 20 }
        ]
      },
      "attendance_regularization_pct": {
        "category": "attendance", "weight": 0.20, "direction": "lower_better",
        "thresholds": [
          { "max": 3, "score": 100 },
          { "max": 6, "score": 80 },
          { "max": 9, "score": 60 },
          { "max": 15, "score": 40 },
          { "max": null, "score": 20 }
        ]
      },
      "service_utilization_pct": {
        "category": "service", "weight": 1.00, "direction": "higher_better",
        "thresholds": [
          { "min": 70, "score": 100 },
          { "min": 60, "score": 80 },
          { "min": 50, "score": 60 },
          { "min": 40, "score": 50 },
          { "min": 30, "score": 30 },
          { "min": 20, "score": 20 },
          { "min": null, "score": 10 }
        ]
      },
      "signoff_missed_pct": {
        "category": "customer", "weight": 0.50, "direction": "lower_better",
        "thresholds": [
          { "max": 1, "score": 100 },
          { "max": 2, "score": 80 },
          { "max": 3, "score": 60 },
          { "max": 4, "score": 40 },
          { "max": null, "score": 20 }
        ]
      },
      "client_escalations_pct": {
        "category": "customer", "weight": 0.50, "direction": "lower_better",
        "thresholds": [
          { "max": 1, "score": 100 },
          { "max": 2, "score": 80 },
          { "max": 3, "score": 60 },
          { "max": 4, "score": 40 },
          { "max": null, "score": 20 }
        ]
      }
    },
    "rating_bands": [
      { "min": 90, "label": "Exceptional" },
      { "min": 80, "label": "Good" },
      { "min": 70, "label": "Satisfactory" },
      { "min": 60, "label": "Needs Improvement" },
      { "min": null, "label": "Unsatisfactory" }
    ]
  }'::jsonb
);

insert into kpi_config (profile_type, version, effective_from, confirmed, config)
select 'salon', 1, '2025-01-01', true, config
from kpi_config where profile_type = 'therapist' and version = 1;

insert into kpi_config (profile_type, version, effective_from, confirmed, config)
select 'doctor', 1, '2025-01-01', false, config
from kpi_config where profile_type = 'therapist' and version = 1;
