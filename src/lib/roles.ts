import type { AccessRole } from "@/lib/database.types";

// Client-safe: no server-only imports. src/lib/auth.ts re-exports this for
// server-side use, but client components must import it from here directly
// — importing it via auth.ts would drag next/headers into the browser bundle.
export const ROLE_LABELS: Record<AccessRole, string> = {
  org_level_executive: "Org Level Executive",
  sales_manager: "Sales Manager",
  sales_executive: "Sales Executive",
};
