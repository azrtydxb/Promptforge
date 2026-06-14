import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPlanContext } from "@/lib/plan";
import { PlansView } from "@/components/billing/plans-view";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  let user;
  try {
    user = await requireAuth();
  } catch {
    redirect("/sign-in");
  }

  const { plan } = await getPlanContext(user.id);

  const subscription = await db.subscription.findFirst({
    where: {
      team: {
        members: {
          some: {
            userId: user.id,
            role: { in: ['OWNER', 'ADMIN'] }
          }
        }
      }
    },
    include: { team: true }
  });

  return (
    <PlansView
      currentPlan={plan}
      subscription={{
        plan: subscription?.plan,
        seatsTotal: subscription?.seatsTotal,
        seatsUsed: subscription?.seatsUsed,
        unitPriceCents: subscription?.unitPriceCents,
        renewsAt: subscription?.renewsAt,
        teamId: subscription?.teamId,
        teamName: subscription?.team?.name,
      }}
    />
  );
}
