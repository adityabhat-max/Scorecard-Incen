// Must stay in sync with supabase/migrations/0004_seed_kpi_config.sql —
// this is the JS/TS mirror used by scripts/verify-scoring.ts (no live DB
// available there) and as the reference for what gets seeded.
import type { KpiConfigShape } from "@/lib/database.types";

export const THERAPIST_DEFAULT_CONFIG: KpiConfigShape = {
  categories: { attendance: 0.3, service: 0.3, customer: 0.4 },
  kpis: {
    attendance_punctuality: {
      category: "attendance",
      weight: 0.35,
      direction: "higher_better",
      thresholds: [
        { min: 95, score: 100 },
        { min: 90, score: 80 },
        { min: 85, score: 60 },
        { min: 80, score: 40 },
        { min: null, score: 20 },
      ],
    },
    leave_pct: {
      category: "attendance",
      weight: 0.25,
      direction: "lower_better",
      thresholds: [
        { max: 3, score: 100 },
        { max: 6, score: 80 },
        { max: 9, score: 60 },
        { max: 15, score: 40 },
        { max: null, score: 20 },
      ],
    },
    absent_without_leave_pct: {
      category: "attendance",
      weight: 0.2,
      direction: "lower_better",
      thresholds: [
        { max: 0, score: 100 },
        { max: 2, score: 60 },
        { max: 5, score: 40 },
        { max: null, score: 20 },
      ],
    },
    attendance_regularization_pct: {
      category: "attendance",
      weight: 0.2,
      direction: "lower_better",
      thresholds: [
        { max: 3, score: 100 },
        { max: 6, score: 80 },
        { max: 9, score: 60 },
        { max: 15, score: 40 },
        { max: null, score: 20 },
      ],
    },
    service_utilization_pct: {
      category: "service",
      weight: 1.0,
      direction: "higher_better",
      thresholds: [
        { min: 70, score: 100 },
        { min: 60, score: 80 },
        { min: 50, score: 60 },
        { min: 40, score: 50 },
        { min: 30, score: 30 },
        { min: 20, score: 20 },
        { min: null, score: 10 },
      ],
    },
    signoff_missed_pct: {
      category: "customer",
      weight: 0.5,
      direction: "lower_better",
      thresholds: [
        { max: 1, score: 100 },
        { max: 2, score: 80 },
        { max: 3, score: 60 },
        { max: 4, score: 40 },
        { max: null, score: 20 },
      ],
    },
    client_escalations_pct: {
      category: "customer",
      weight: 0.5,
      direction: "lower_better",
      thresholds: [
        { max: 1, score: 100 },
        { max: 2, score: 80 },
        { max: 3, score: 60 },
        { max: 4, score: 40 },
        { max: null, score: 20 },
      ],
    },
  },
  rating_bands: [
    { min: 90, label: "Exceptional" },
    { min: 80, label: "Good" },
    { min: 70, label: "Satisfactory" },
    { min: 60, label: "Needs Improvement" },
    { min: null, label: "Unsatisfactory" },
  ],
};
