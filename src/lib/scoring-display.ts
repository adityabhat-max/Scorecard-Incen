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
