import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { LocationOverview } from "@/components/location-overview";
import { ExecutiveOverview } from "@/components/executive-overview";

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

  // org_level_executive: company-wide executive summary
  return (
    <AppShell profile={profile}>
      <ExecutiveOverview />
    </AppShell>
  );
}
