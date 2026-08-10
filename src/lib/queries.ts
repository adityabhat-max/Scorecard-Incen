import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export async function getLocations(supabase: Client) {
  const { data, error } = await supabase.from("locations").select("id, name").order("name");
  if (error) throw error;
  return data;
}

export async function getLocationName(supabase: Client, locationId: string) {
  const { data } = await supabase
    .from("locations")
    .select("id, name")
    .eq("id", locationId)
    .maybeSingle();
  return data?.name ?? null;
}

export async function getLatestBatchForLocation(supabase: Client, locationId: string) {
  const { data, error } = await supabase
    .from("score_batches")
    .select("id, period, uploaded_at, source_filename")
    .eq("location_id", locationId)
    .order("period", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface ScorecardRow {
  staffMemberId: string;
  fullName: string;
  profileType: Database["public"]["Tables"]["staff_members"]["Row"]["profile_type"];
  employeeCode: string | null;
  finalScore: number;
  rating: string;
  categoryScores: { attendance: number; service: number; customer: number };
  kpiScores: Record<string, number | null>;
}

// Flat queries + manual join rather than PostgREST embedded-resource syntax,
// since we don't have generated types with relationship metadata to keep
// that path type-safe.
export async function getScorecardsForBatch(
  supabase: Client,
  batchId: string,
): Promise<ScorecardRow[]> {
  const { data: scores, error } = await supabase
    .from("computed_scores")
    .select("staff_member_id, final_score, rating, category_scores, kpi_scores")
    .eq("batch_id", batchId)
    .order("final_score", { ascending: false });
  if (error) throw error;
  if (!scores || scores.length === 0) return [];

  const staffIds = scores.map((s) => s.staff_member_id);
  const { data: staff, error: staffError } = await supabase
    .from("staff_members")
    .select("id, full_name, profile_type, employee_code")
    .in("id", staffIds);
  if (staffError) throw staffError;

  const staffById = new Map((staff ?? []).map((s) => [s.id, s]));

  return scores.map((s) => {
    const member = staffById.get(s.staff_member_id);
    return {
      staffMemberId: s.staff_member_id,
      fullName: member?.full_name ?? "Unknown",
      profileType: member?.profile_type ?? "therapist",
      employeeCode: member?.employee_code ?? null,
      finalScore: s.final_score,
      rating: s.rating,
      categoryScores: s.category_scores,
      kpiScores: s.kpi_scores,
    };
  });
}

export async function getStaffMember(supabase: Client, staffMemberId: string) {
  const { data, error } = await supabase
    .from("staff_members")
    .select("id, full_name, profile_type, employee_code, location_id, login_profile_id")
    .eq("id", staffMemberId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getStaffScoreHistory(supabase: Client, staffMemberId: string) {
  const { data, error } = await supabase
    .from("computed_scores")
    .select("period, final_score, rating, category_scores, kpi_scores, batch_id")
    .eq("staff_member_id", staffMemberId)
    .order("period", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getStaffMemberByLoginProfile(supabase: Client, profileId: string) {
  const { data, error } = await supabase
    .from("staff_members")
    .select("id, full_name, profile_type, employee_code, location_id")
    .eq("login_profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getLatestScoreForStaff(supabase: Client, staffMemberId: string) {
  const { data, error } = await supabase
    .from("computed_scores")
    .select("*")
    .eq("staff_member_id", staffMemberId)
    .order("period", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getRawEntry(supabase: Client, batchId: string, staffMemberId: string) {
  const { data, error } = await supabase
    .from("raw_kpi_entries")
    .select("*")
    .eq("batch_id", batchId)
    .eq("staff_member_id", staffMemberId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getKpiConfigById(supabase: Client, id: string) {
  const { data, error } = await supabase
    .from("kpi_config")
    .select("id, profile_type, config, confirmed, version, effective_from")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getKpiConfig(
  supabase: Client,
  profileType: Database["public"]["Tables"]["staff_members"]["Row"]["profile_type"],
) {
  const { data, error } = await supabase
    .from("kpi_config")
    .select("id, config, confirmed, version, effective_from")
    .eq("profile_type", profileType)
    .order("effective_from", { ascending: false })
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
