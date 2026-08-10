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

export interface LocationSummary {
  locationId: string;
  locationName: string;
  period: string | null;
  staffScored: number;
  avgScore: number;
  distribution: Record<string, number>;
}

export interface CompanyOverview {
  locations: LocationSummary[];
  totalStaffScored: number;
  totalStaffOnRoster: number;
  companyAvgScore: number;
  companyDistribution: Record<string, number>;
  topPerformers: (ScorecardRow & { locationName: string })[];
  needsAttention: (ScorecardRow & { locationName: string })[];
  profileTypeBreakdown: { profileType: string; count: number; avgScore: number }[];
}

const RATING_ORDER = ["Exceptional", "Good", "Satisfactory", "Needs Improvement", "Unsatisfactory"];

// Company-wide roll-up for the org_level_executive landing page: pulls each
// location's most recent batch (periods can differ across locations — not
// every location has uploaded the same month yet) and aggregates across all
// of them. N+1-ish (one pair of queries per location) but there are only a
// handful of locations, so this stays simple rather than needing a SQL view.
export async function getCompanyOverview(supabase: Client): Promise<CompanyOverview> {
  const locations = await getLocations(supabase);

  const { count: totalStaffOnRoster } = await supabase
    .from("staff_members")
    .select("*", { count: "exact", head: true })
    .eq("active", true);

  const perLocation = await Promise.all(
    locations.map(async (loc) => {
      const batch = await getLatestBatchForLocation(supabase, loc.id);
      const scorecards = batch ? await getScorecardsForBatch(supabase, batch.id) : [];
      return { location: loc, batch, scorecards };
    }),
  );

  const locationSummaries: LocationSummary[] = perLocation.map(({ location, batch, scorecards }) => {
    const distribution: Record<string, number> = {};
    for (const label of RATING_ORDER) distribution[label] = 0;
    for (const s of scorecards) distribution[s.rating] = (distribution[s.rating] ?? 0) + 1;

    return {
      locationId: location.id,
      locationName: location.name,
      period: batch?.period ?? null,
      staffScored: scorecards.length,
      avgScore:
        scorecards.length > 0
          ? Math.round(scorecards.reduce((sum, s) => sum + s.finalScore, 0) / scorecards.length)
          : 0,
      distribution,
    };
  });

  const allScorecards = perLocation.flatMap(({ location, scorecards }) =>
    scorecards.map((s) => ({ ...s, locationName: location.name })),
  );

  const companyDistribution: Record<string, number> = {};
  for (const label of RATING_ORDER) companyDistribution[label] = 0;
  for (const s of allScorecards) companyDistribution[s.rating] = (companyDistribution[s.rating] ?? 0) + 1;

  const sorted = [...allScorecards].sort((a, b) => b.finalScore - a.finalScore);

  const profileTypeMap = new Map<string, { count: number; total: number }>();
  for (const s of allScorecards) {
    const entry = profileTypeMap.get(s.profileType) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += s.finalScore;
    profileTypeMap.set(s.profileType, entry);
  }

  return {
    locations: locationSummaries,
    totalStaffScored: allScorecards.length,
    totalStaffOnRoster: totalStaffOnRoster ?? allScorecards.length,
    companyAvgScore:
      allScorecards.length > 0
        ? Math.round(allScorecards.reduce((sum, s) => sum + s.finalScore, 0) / allScorecards.length)
        : 0,
    companyDistribution,
    topPerformers: sorted.slice(0, 5),
    needsAttention: sorted
      .filter((s) => s.rating === "Unsatisfactory" || s.rating === "Needs Improvement")
      .slice(-8)
      .reverse(),
    profileTypeBreakdown: Array.from(profileTypeMap.entries()).map(([profileType, { count, total }]) => ({
      profileType,
      count,
      avgScore: Math.round(total / count),
    })),
  };
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
