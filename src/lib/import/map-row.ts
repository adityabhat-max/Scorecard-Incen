import type { RawSheetRow } from "@/lib/import/parse-report";
import type { StaffProfileType } from "@/lib/database.types";

export interface MappedRow {
  center: string;
  profileType: StaffProfileType;
  fullName: string;
  applicable: boolean;
  attendance_punctuality: number | null;
  leave_pct: number | null;
  absent_without_leave_pct: number | null;
  attendance_regularization_pct: number | null;
  service_utilization_pct: number | null;
  signoff_missed_pct: number | null;
  client_escalations_pct: number | null;
}

export interface MapRowError {
  row: number;
  message: string;
}

const PROFILE_MAP: Record<string, StaffProfileType> = {
  th: "therapist",
  therapist: "therapist",
  dr: "doctor",
  doctor: "doctor",
  saloon: "salon",
  salon: "salon",
};

// Values in the real export are fractions (e.g. 0.35 = 35%, and Attendance
// Punctuality can exceed 1.0). Multiply by 100 to store as a percentage.
function toPct(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(value);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100 * 100) / 100;
}

export function mapRow(raw: RawSheetRow, rowNumber: number): MappedRow | MapRowError {
  const profileRaw = String(raw["Profile"] ?? "").trim().toLowerCase();
  const profileType = PROFILE_MAP[profileRaw];
  if (!profileType) {
    return { row: rowNumber, message: `Unknown Profile "${raw["Profile"]}" — expected TH, Dr, or Saloon` };
  }

  const fullName = String(raw["Service By Perfomed"] ?? "").trim();
  if (!fullName) {
    return { row: rowNumber, message: "Missing staff name (Service By Perfomed)" };
  }

  const center = String(raw["Center"] ?? "").trim();
  if (!center) {
    return { row: rowNumber, message: `Missing Center for ${fullName}` };
  }

  const applicableRaw = String(raw["Aplicable - Status"] ?? "").trim().toLowerCase();
  const applicable = applicableRaw === "applicable";

  // Doctors substitute Prescription sign-off compliance for Missed
  // Signatures (verified: high value = bad, same direction).
  const signoffSource =
    profileType === "doctor" ? raw["Prescription sign missed Ratio"] : raw["Missed customer Signiture %"];

  return {
    center,
    profileType,
    fullName,
    applicable,
    attendance_punctuality: toPct(raw["Attendance Punctuality"]),
    leave_pct: toPct(raw["Leave %"]),
    absent_without_leave_pct: toPct(raw["Absent without leave %"]),
    attendance_regularization_pct: toPct(raw["Attendance Regularization"]),
    service_utilization_pct: toPct(raw["Service Utilization %"]),
    signoff_missed_pct: toPct(signoffSource),
    client_escalations_pct: toPct(raw["Client Escalations %"]),
  };
}

export function isMapRowError(x: MappedRow | MapRowError): x is MapRowError {
  return "message" in x;
}
