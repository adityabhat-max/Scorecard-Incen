import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { UploadForm } from "@/components/upload-form";

export default async function UploadPage() {
  const profile = await requireProfile();

  if (profile.role === "sales_executive") {
    redirect("/me");
  }

  return (
    <AppShell profile={profile}>
      <UploadForm />
    </AppShell>
  );
}
