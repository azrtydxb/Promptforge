import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPlanContext } from "@/lib/plan";
import { PlansView } from "@/components/billing/plans-view";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect("/sign-in");
  }

  const { plan } = await getPlanContext(user.id);
  return <PlansView currentPlan={plan} />;
}
