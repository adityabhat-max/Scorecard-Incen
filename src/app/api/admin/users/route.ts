import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AccessRole } from "@/lib/database.types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "org_level_executive") {
    return NextResponse.json({ error: "Only Org Level Executives can create users" }, { status: 403 });
  }

  const body = await request.json();
  const { email, password, fullName, role, locationId } = body as {
    email?: string;
    password?: string;
    fullName?: string;
    role?: AccessRole;
    locationId?: string | null;
  };

  if (!email || !password || !fullName || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (role !== "org_level_executive" && !locationId) {
    return NextResponse.json({ error: "Sales Manager and Sales Executive accounts need a location" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? "Failed to create user" }, { status: 400 });
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name: fullName,
    role,
    location_id: role === "org_level_executive" ? null : locationId,
  });

  if (profileError) {
    // Roll back the auth user so we don't leave an orphaned login with no profile.
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ id: created.user.id });
}
