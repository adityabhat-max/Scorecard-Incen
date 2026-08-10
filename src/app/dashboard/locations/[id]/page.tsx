import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { LocationOverview } from "@/components/location-overview";

export default async function LocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();

  if (profile.role === "sales_executive") {
    redirect("/me");
  }
  // Defense in depth: RLS already scopes the underlying queries, but a
  // sales_manager visiting another location's URL should bounce to their own
  // rather than see an empty/confusing page.
  if (profile.role === "sales_manager" && profile.locationId !== id) {
    redirect("/dashboard");
  }

  return (
    <AppShell profile={profile}>
      <LocationOverview locationId={id} />
    </AppShell>
  );
}
