import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getStaffMember } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { StaffScorecard } from "@/components/staff-scorecard";

export default async function StaffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();

  if (profile.role === "sales_executive") {
    redirect("/me");
  }

  if (profile.role === "sales_manager") {
    const supabase = await createClient();
    const staff = await getStaffMember(supabase, id);
    if (!staff || staff.location_id !== profile.locationId) {
      redirect("/dashboard");
    }
  }

  return (
    <AppShell profile={profile}>
      <StaffScorecard staffMemberId={id} />
    </AppShell>
  );
}
