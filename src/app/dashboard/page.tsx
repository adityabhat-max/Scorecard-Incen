import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLocations } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { LocationOverview } from "@/components/location-overview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const profile = await requireProfile();

  if (profile.role === "sales_executive") {
    redirect("/me");
  }

  if (profile.role === "sales_manager") {
    if (!profile.locationId) {
      redirect("/login");
    }
    return (
      <AppShell profile={profile}>
        <LocationOverview locationId={profile.locationId} />
      </AppShell>
    );
  }

  // org_level_executive: company-wide view across all locations
  const supabase = await createClient();
  const locations = await getLocations(supabase);

  return (
    <AppShell profile={profile}>
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">All Locations</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((loc) => (
            <Link key={loc.id} href={`/dashboard/locations/${loc.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle>{loc.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  View staff scorecards
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
