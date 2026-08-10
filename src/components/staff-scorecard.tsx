import { createClient } from "@/lib/supabase/server";
import {
  getKpiConfigById,
  getLatestScoreForStaff,
  getRawEntry,
  getStaffMember,
  getStaffScoreHistory,
} from "@/lib/queries";
import { formatPct, kpiLabel, kpiTargetLabel, ratingBadgeVariant } from "@/lib/scoring-display";
import { rankImprovementOpportunities, type RawKpiValues } from "@/lib/scoring";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScoreTrendChart } from "@/components/score-trend-chart";
import type { KpiConfigShape } from "@/lib/database.types";

export async function StaffScorecard({ staffMemberId }: { staffMemberId: string }) {
  const supabase = await createClient();
  const staff = await getStaffMember(supabase, staffMemberId);

  if (!staff) {
    return <div className="text-muted-foreground">Staff member not found.</div>;
  }

  const [latest, history] = await Promise.all([
    getLatestScoreForStaff(supabase, staffMemberId),
    getStaffScoreHistory(supabase, staffMemberId),
  ]);

  if (!latest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{staff.full_name}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          No score data yet for this person.
        </CardContent>
      </Card>
    );
  }

  const [config, raw] = await Promise.all([
    getKpiConfigById(supabase, latest.kpi_config_id),
    getRawEntry(supabase, latest.batch_id, staffMemberId),
  ]);

  const kpiConfig = config?.config as KpiConfigShape | undefined;
  const kpiScores = latest.kpi_scores as Record<string, number | null>;

  const opportunities =
    kpiConfig && raw
      ? rankImprovementOpportunities(
          {
            attendance_punctuality: raw.attendance_punctuality,
            leave_pct: raw.leave_pct,
            absent_without_leave_pct: raw.absent_without_leave_pct,
            attendance_regularization_pct: raw.attendance_regularization_pct,
            service_utilization_pct: raw.service_utilization_pct,
            signoff_missed_pct: raw.signoff_missed_pct,
            client_escalations_pct: raw.client_escalations_pct,
          } as RawKpiValues,
          kpiConfig,
        ).slice(0, 2)
      : [];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-xl">{staff.full_name}</CardTitle>
            <div className="mt-1 text-sm capitalize text-muted-foreground">
              {staff.profile_type}
              {staff.employee_code && ` · ${staff.employee_code}`}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold">{latest.final_score}/100</div>
            <Badge variant={ratingBadgeVariant(latest.rating)}>{latest.rating}</Badge>
          </div>
        </CardHeader>
        {config && !config.confirmed && (
          <CardContent className="pt-0">
            <p className="rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              This profile type&apos;s scoring formula is using Therapist defaults and has not
              been confirmed yet — treat this score as provisional.
            </p>
          </CardContent>
        )}
      </Card>

      {raw && kpiConfig && (
        <Card>
          <CardHeader>
            <CardTitle>KPI Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>KPI</TableHead>
                  <TableHead>Raw</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(kpiConfig.kpis).map(([key, def]) => (
                  <TableRow key={key}>
                    <TableCell>{kpiLabel(key, staff.profile_type)}</TableCell>
                    <TableCell>
                      {formatPct(raw[key as keyof typeof raw] as number | null)}
                    </TableCell>
                    <TableCell className="font-medium">{kpiScores[key] ?? "-"}</TableCell>
                    <TableCell className="text-muted-foreground">{kpiTargetLabel(def)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {opportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Improvement Action Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {opportunities.map((o) => (
                <li key={o.kpiKey} className="flex items-center justify-between text-sm">
                  <span>
                    {kpiLabel(o.kpiKey, staff.profile_type)}: move from {o.currentValue}% to{" "}
                    {o.targetValue}%
                  </span>
                  <Badge variant="outline">+{o.pointGain} points</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {history.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreTrendChart
              data={history.map((h) => ({ period: h.period, score: h.final_score }))}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
