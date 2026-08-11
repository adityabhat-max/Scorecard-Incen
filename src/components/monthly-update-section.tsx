import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadForm } from "@/components/upload-form";
import type { LocationSummary } from "@/lib/queries";

function monthsBehind(period: string | null): number | null {
  if (!period) return null;
  const [y, m] = period.split("-").map(Number);
  const periodDate = new Date(y, m - 1, 1);
  const now = new Date();
  const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return (
    (nowMonth.getFullYear() - periodDate.getFullYear()) * 12 + (nowMonth.getMonth() - periodDate.getMonth())
  );
}

function staleness(period: string | null) {
  const behind = monthsBehind(period);
  if (behind === null) return { label: "No data yet", variant: "destructive" as const };
  if (behind <= 0) return { label: "Up to date", variant: "secondary" as const };
  if (behind === 1) return { label: "1 month behind", variant: "outline" as const };
  return { label: `${behind} months behind`, variant: "destructive" as const };
}

const currentMonthLabel = new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });

export function MonthlyUpdateSection({ locations }: { locations: LocationSummary[] }) {
  const sorted = [...locations].sort((a, b) => (monthsBehind(b.period) ?? 999) - (monthsBehind(a.period) ?? 999));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Update</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            Where each location stands, and what&apos;s needed to bring it current to{" "}
            <strong className="text-foreground">{currentMonthLabel}</strong>:
          </p>
          <div className="flex flex-wrap gap-2">
            {sorted.map((loc) => {
              const s = staleness(loc.period);
              return (
                <Badge key={loc.locationId} variant={s.variant} className="text-xs">
                  {loc.locationName}: {s.label}
                </Badge>
              );
            })}
          </div>
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p className="mb-2 text-foreground">
            <strong>What to upload:</strong> the usual monthly report — one row per staff member,
            with these columns:
          </p>
          <p className="mb-2">
            <code className="text-xs">Profile</code>, <code className="text-xs">Service By Perfomed</code>,{" "}
            <code className="text-xs">Attendance Punctuality</code>, <code className="text-xs">Leave %</code>,{" "}
            <code className="text-xs">Absent without leave %</code>,{" "}
            <code className="text-xs">Attendance Regularization</code>,{" "}
            <code className="text-xs">Service Utilization %</code>,{" "}
            <code className="text-xs">Missed customer Signiture %</code> (Therapist/Salon) or{" "}
            <code className="text-xs">Prescription sign missed Ratio</code> (Doctor),{" "}
            <code className="text-xs">Client Escalations %</code>, <code className="text-xs">Center</code>,{" "}
            <code className="text-xs">Aplicable - Status</code>.
          </p>
          <p>
            Percentages are decimals — <strong className="text-foreground">95% is 0.95</strong>, not 95. A file
            with multiple locations in it is fine; rows are grouped by <code className="text-xs">Center</code>{" "}
            automatically. Full details in <code className="text-xs">HOW_TO_ADD_DATA.md</code> and the ready-made
            template at <code className="text-xs">templates/monthly-report-template.csv</code>.
          </p>
        </div>

        <UploadForm showHeader={false} />
      </CardContent>
    </Card>
  );
}
