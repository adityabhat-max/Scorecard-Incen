import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLatestBatchForLocation, getLocationName, getScorecardsForBatch } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ratingBadgeVariant } from "@/lib/scoring-display";

const RATING_ORDER = ["Exceptional", "Good", "Satisfactory", "Needs Improvement", "Unsatisfactory"];

export async function LocationOverview({ locationId }: { locationId: string }) {
  const supabase = await createClient();
  const [locationName, batch] = await Promise.all([
    getLocationName(supabase, locationId),
    getLatestBatchForLocation(supabase, locationId),
  ]);

  if (!batch) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{locationName ?? "Location"}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          No score data uploaded yet for this location.
        </CardContent>
      </Card>
    );
  }

  const scorecards = await getScorecardsForBatch(supabase, batch.id);
  const avg =
    scorecards.length > 0
      ? Math.round(scorecards.reduce((sum, s) => sum + s.finalScore, 0) / scorecards.length)
      : 0;

  const distribution = RATING_ORDER.map((label) => ({
    label,
    count: scorecards.filter((s) => s.rating === label).length,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {locationName}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {new Date(batch.period).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Staff Scored</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{scorecards.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{avg}/100</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rating Mix</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1">
            {distribution
              .filter((d) => d.count > 0)
              .map((d) => (
                <Badge key={d.label} variant={ratingBadgeVariant(d.label)} className="text-xs">
                  {d.count} {d.label}
                </Badge>
              ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff Scorecards</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scorecards.map((s) => (
                <TableRow key={s.staffMemberId}>
                  <TableCell>
                    <Link href={`/dashboard/staff/${s.staffMemberId}`} className="hover:underline">
                      {s.fullName}
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize text-muted-foreground">{s.profileType}</TableCell>
                  <TableCell className="font-medium">{s.finalScore}/100</TableCell>
                  <TableCell>
                    <Badge variant={ratingBadgeVariant(s.rating)}>{s.rating}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
