import Link from "next/link";
import { ROLE_LABELS, type CurrentProfile } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AppShell({
  profile,
  locationName,
  children,
}: {
  profile: CurrentProfile;
  locationName?: string | null;
  children: React.ReactNode;
}) {
  const isOrg = profile.role === "org_level_executive";
  const isManager = profile.role === "sales_manager";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold">
            Isaac Wellness Scorecard
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            {(isOrg || isManager) && (
              <Link href="/dashboard" className="hover:text-foreground">
                Dashboard
              </Link>
            )}
            {profile.role === "sales_executive" && (
              <Link href="/me" className="hover:text-foreground">
                My Scorecard
              </Link>
            )}
            {(isOrg || isManager) && (
              <Link href="/admin/upload" className="hover:text-foreground">
                Upload Data
              </Link>
            )}
            {isOrg && (
              <>
                <Link href="/admin/users" className="hover:text-foreground">
                  Users
                </Link>
                <Link href="/admin/kpi-config" className="hover:text-foreground">
                  KPI Config
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-sm">
            <div className="font-medium">{profile.fullName}</div>
            <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                {ROLE_LABELS[profile.role]}
              </Badge>
              {locationName && <span>{locationName}</span>}
            </div>
          </div>
          <form action="/auth/sign-out" method="post">
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 bg-muted/20 p-6">{children}</main>
    </div>
  );
}
