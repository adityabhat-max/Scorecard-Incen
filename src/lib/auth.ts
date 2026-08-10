import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AccessRole } from "@/lib/database.types";

export { ROLE_LABELS } from "@/lib/roles";

export interface CurrentProfile {
  id: string;
  fullName: string;
  role: AccessRole;
  locationId: string | null;
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, location_id")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
    locationId: profile.location_id,
  };
}

export async function requireProfile(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}
