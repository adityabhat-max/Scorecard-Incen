import type { KpiConfigShape } from "@/lib/database.types";

export const KPI_LABELS: Record<keyof KpiConfigShape["kpis"], string> = {
  attendance_punctuality: "Attendance Punctuality",
  leave_pct: "Leave %",
  absent_without_leave_pct: "Absent Without Leave",
  attendance_regularization_pct: "Attendance Regularization",
  service_utilization_pct: "Service Utilization",
  signoff_missed_pct: "Missed Signatures",
  client_escalations_pct: "Client Escalations",
};

export function kpiLabel(key: string, profileType?: string): string {
  if (key === "signoff_missed_pct" && profileType === "doctor") {
    return "Prescription Sign-off Missed";
  }
  return KPI_LABELS[key as keyof KpiConfigShape["kpis"]] ?? key;
}

// Traffic-light read used by the score ring and progress bar (vs. the
// gold/taupe/rose badges elsewhere) — red/green/blue at a glance. CVD-checked:
// red<->green sits at ΔE 7.8 (deutan), inside the 6-8 warn band, which is
// only legal paired with a text label — every place this is used always has
// the number and/or rating name alongside it, so that condition holds.
export const RATING_COLOR: Record<string, string> = {
  Exceptional: "#5ec8f2",
  Good: "#5ec8f2",
  Satisfactory: "#10b981",
  "Needs Improvement": "#e5484d",
  Unsatisfactory: "#e5484d",
};

// One line of framing per rating tier — ties the number to what it actually
// means and, for the lower tiers, points at the improvement plan below it
// rather than just naming the problem.
export const RATING_MESSAGE: Record<string, string> = {
  Exceptional: "Outstanding performance — this is the standard the rest of the team is measured against.",
  Good: "Strong, dependable work. You're operating comfortably above baseline across the board.",
  Satisfactory: "A solid score. A little more consistency in a couple of areas would move this into Good.",
  "Needs Improvement": "There's a real gap to close here — the improvement plan below shows exactly where to focus.",
  Unsatisfactory: "This score needs attention soon — talk to your manager about the plan below.",
};

export function ratingBadgeVariant(
  rating: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (rating) {
    case "Exceptional":
    case "Good":
      return "default";
    case "Satisfactory":
      return "secondary";
    case "Needs Improvement":
      return "outline";
    case "Unsatisfactory":
      return "destructive";
    default:
      return "outline";
  }
}

// The best-scoring threshold band, formatted as a target string for display
// (mirrors the "TARGET" column from the original pptx scorecards).
export function kpiTargetLabel(def: KpiConfigShape["kpis"][keyof KpiConfigShape["kpis"]]): string {
  const best =
    def.direction === "higher_better"
      ? def.thresholds.find((t) => t.min !== null && t.min !== undefined)
      : def.thresholds[0];

  if (!best) return "-";

  if (def.direction === "higher_better") {
    return `${best.min}%+`;
  }
  return `≤${best.max}%`;
}

export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return `${value}%`;
}
