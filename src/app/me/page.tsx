import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getStaffMemberByLoginProfile } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { StaffScorecard } from "@/components/staff-scorecard";

export default async function MyScorecardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const staff = await getStaffMemberByLoginProfile(supabase, profile.id);

  return (
    <AppShell profile={profile}>
      {staff ? (
        <StaffScorecard staffMemberId={staff.id} />
      ) : (
        <p className="text-muted-foreground">
          Your account isn&apos;t linked to a staff record yet — ask your manager to link it.
        </p>
      )}
    </AppShell>
  );
}
