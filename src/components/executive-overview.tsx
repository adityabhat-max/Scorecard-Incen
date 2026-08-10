import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCompanyOverview } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScoreRing } from "@/components/score-ring";
import { ratingBadgeVariant } from "@/lib/scoring-display";

function formatPeriod(period: string | null) {
  if (!period) return "No data";
  return new Date(period).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export async function ExecutiveOverview() {
  const supabase = await createClient();
  const [overview, { data: kpiConfigs }] = await Promise.all([
    getCompanyOverview(supabase),
    supabase.from("kpi_config").select("profile_type, confirmed"),
  ]);

  const confirmedByProfile = new Map<string, boolean>(
    (kpiConfigs ?? []).map((c) => [c.profile_type, c.confirmed]),
  );
  const distinctPeriods = new Set(overview.locations.map((l) => l.period).filter(Boolean));
  const rankedLocations = [...overview.locations].sort((a, b) => b.avgScore - a.avgScore);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Company Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Across {overview.locations.length} location{overview.locations.length === 1 ? "" : "s"}
          {distinctPeriods.size > 1 && (
            <span> — note: locations are on different reporting periods, not all the same month</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Locations</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{overview.locations.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Staff Scored</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{overview.totalStaffScored}</div>
            {overview.totalStaffOnRoster > overview.totalStaffScored && (
              <div className="mt-0.5 text-xs text-muted-foreground">
                of {overview.totalStaffOnRoster} on roster — rest marked Not Applicable this period
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Company Average</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center pb-1">
            <ScoreRing
              score={overview.companyAvgScore}
              rating={
                overview.companyAvgScore >= 80
                  ? "Good"
                  : overview.companyAvgScore >= 70
                    ? "Satisfactory"
                    : "Needs Improvement"
              }
              size={72}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rating Mix</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1">
            {Object.entries(overview.companyDistribution)
              .filter(([, count]) => count > 0)
              .map(([label, count]) => (
                <Badge key={label} variant={ratingBadgeVariant(label)} className="text-xs">
                  {count} {label}
                </Badge>
              ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Locations, Ranked by Average Score</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Staff Scored</TableHead>
                <TableHead>Avg Score</TableHead>
                <TableHead>Rating Mix</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankedLocations.map((loc) => (
                <TableRow key={loc.locationId}>
                  <TableCell>
                    <Link href={`/dashboard/locations/${loc.locationId}`} className="hover:underline">
                      {loc.locationName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatPeriod(loc.period)}</TableCell>
                  <TableCell>{loc.staffScored}</TableCell>
                  <TableCell className="font-medium">{loc.staffScored > 0 ? `${loc.avgScore}/100` : "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(loc.distribution)
                        .filter(([, count]) => count > 0)
                        .map(([label, count]) => (
                          <Badge key={label} variant={ratingBadgeVariant(label)} className="text-xs">
                            {count} {label}
                          </Badge>
                        ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {overview.topPerformers.map((s) => (
              <Link
                key={s.staffMemberId}
                href={`/dashboard/staff/${s.staffMemberId}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              >
                <div>
                  <div className="font-medium">{s.fullName}</div>
                  <div className="text-xs text-muted-foreground">{s.locationName}</div>
                </div>
                <Badge variant={ratingBadgeVariant(s.rating)}>{s.finalScore}/100</Badge>
              </Link>
            ))}
            {overview.topPerformers.length === 0 && (
              <p className="text-sm text-muted-foreground">No scored staff yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Needs Attention</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {overview.needsAttention.map((s) => (
              <Link
                key={s.staffMemberId}
                href={`/dashboard/staff/${s.staffMemberId}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              >
                <div>
                  <div className="font-medium">{s.fullName}</div>
                  <div className="text-xs text-muted-foreground">{s.locationName}</div>
                </div>
                <Badge variant={ratingBadgeVariant(s.rating)}>{s.finalScore}/100</Badge>
              </Link>
            ))}
            {overview.needsAttention.length === 0 && (
              <p className="text-sm text-muted-foreground">Nobody in the lower rating tiers right now.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By Profile Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profile</TableHead>
                <TableHead>Staff Scored</TableHead>
                <TableHead>Avg Score</TableHead>
                <TableHead>Formula Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.profileTypeBreakdown.map((p) => {
                const confirmed = confirmedByProfile.get(p.profileType) ?? true;
                return (
                  <TableRow key={p.profileType}>
                    <TableCell className="capitalize">{p.profileType}</TableCell>
                    <TableCell>{p.count}</TableCell>
                    <TableCell className="font-medium">{p.avgScore}/100</TableCell>
                    <TableCell>
                      {confirmed ? (
                        <Badge variant="secondary">Confirmed</Badge>
                      ) : (
                        <Badge variant="destructive">Using Therapist defaults — unconfirmed</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
