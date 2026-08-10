import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";

export default async function RootPage() {
  const profile = await requireProfile();

  if (profile.role === "sales_executive") {
    redirect("/me");
  }
  redirect("/dashboard");
}
