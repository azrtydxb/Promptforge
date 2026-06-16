import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminPageClient from "./AdminPageClient";
import { getSystemHealth } from "@/app/actions/admin.actions";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  // Fix 1: Access gate
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MODERATOR")) {
    redirect("/dashboard");
  }

  // Fix 3: Real system health
  let systemHealthy = true;
  try {
    const health = await getSystemHealth();
    systemHealthy =
      health.postgres.status === "healthy" && health.redis.status === "healthy";
  } catch {
    systemHealthy = false;
  }

  // Fix 6: Read current team AI settings
  let teamSettings: Record<string, unknown> | null = null;
  let teamId: string | null = null;
  try {
    const membership = await db.teamMember.findFirst({
      where: { userId: user.id },
      include: { team: { select: { id: true, settings: true } } },
    });
    if (membership?.team) {
      teamId = membership.team.id;
      teamSettings =
        (membership.team.settings as Record<string, unknown>) ?? null;
    }
  } catch {
    // ignore
  }

  const resolvedParams = await searchParams;
  const initialTab = resolvedParams?.tab ?? "overview";

  return (
    <AdminPageClient
      systemHealthy={systemHealthy}
      userRole={user.role}
      teamId={teamId}
      teamSettings={teamSettings}
      initialTab={initialTab}
    />
  );
}
