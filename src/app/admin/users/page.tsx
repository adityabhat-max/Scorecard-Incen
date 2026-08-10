import { redirect } from "next/navigation";
import { requireProfile, ROLE_LABELS } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLocations } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { CreateUserForm } from "@/components/create-user-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function UsersPage() {
  const profile = await requireProfile();
  if (profile.role !== "org_level_executive") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const [locations, { data: profiles }] = await Promise.all([
    getLocations(supabase),
    supabase
      .from("profiles")
      .select("id, full_name, role, location_id")
      .order("full_name"),
  ]);

  const locationById = new Map(locations.map((l) => [l.id, l.name]));

  return (
    <AppShell profile={profile}>
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Users</h1>
        <CreateUserForm locations={locations} />
        <Card>
          <CardHeader>
            <CardTitle>All Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(profiles ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.full_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ROLE_LABELS[p.role]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.location_id ? locationById.get(p.location_id) ?? "-" : "All locations"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
