import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { kpiLabel } from "@/lib/scoring-display";
import type { KpiConfigShape } from "@/lib/database.types";

export default async function KpiConfigPage() {
  const profile = await requireProfile();
  if (profile.role !== "org_level_executive") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: configs } = await supabase
    .from("kpi_config")
    .select("id, profile_type, version, effective_from, confirmed, config")
    .order("profile_type")
    .order("version", { ascending: false });

  return (
    <AppShell profile={profile}>
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">KPI Scoring Config</h1>
        {(configs ?? []).map((cfg) => {
          const shape = cfg.config as KpiConfigShape;
          return (
            <Card key={cfg.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="capitalize">
                  {cfg.profile_type} · v{cfg.version}
                </CardTitle>
                <Badge variant={cfg.confirmed ? "secondary" : "destructive"}>
                  {cfg.confirmed ? "Confirmed" : "Unconfirmed — using Therapist defaults"}
                </Badge>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>KPI</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Weight in Category</TableHead>
                      <TableHead>Direction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(shape.kpis).map(([key, def]) => (
                      <TableRow key={key}>
                        <TableCell>{kpiLabel(key, cfg.profile_type)}</TableCell>
                        <TableCell className="capitalize text-muted-foreground">{def.category}</TableCell>
                        <TableCell>{Math.round(def.weight * 100)}%</TableCell>
                        <TableCell className="text-muted-foreground">
                          {def.direction === "higher_better" ? "Higher is better" : "Lower is better"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="mt-3 text-sm text-muted-foreground">
                  Category weights: Attendance {Math.round(shape.categories.attendance * 100)}%, Service{" "}
                  {Math.round(shape.categories.service * 100)}%, Customer {Math.round(shape.categories.customer * 100)}%
                </p>
              </CardContent>
            </Card>
          );
        })}
        <p className="text-sm text-muted-foreground">
          Threshold and weight editing isn&apos;t wired up yet — for now, config changes go
          through a new row in <code>kpi_config</code> directly (versioned, so past scores
          stay reproducible under the config that was active when they were computed).
        </p>
      </div>
    </AppShell>
  );
}
