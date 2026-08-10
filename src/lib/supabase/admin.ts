import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Service-role client — bypasses RLS entirely. Server-only: never import
// this from a Client Component or expose SUPABASE_SERVICE_ROLE_KEY to the
// browser. Only used for admin operations (creating auth users) after the
// caller's own org_level_executive role has already been verified with a
// normal RLS-scoped client.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
