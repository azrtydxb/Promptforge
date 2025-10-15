import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPendingModeration, getModerationStats } from "@/app/actions/moderation.actions";
import { ModerationDashboard } from "@/components/moderation/moderation-dashboard";

export const metadata = {
  title: "Content Moderation | PromptForge",
  description: "Moderate and review content",
};

export default async function ModerationPage() {
  try {
    const user = await requireAuth();

    // Check if user is moderator or admin
    if (user.role !== "MODERATOR" && user.role !== "ADMIN") {
      redirect("/dashboard");
    }

    const [moderationResult, statsResult] = await Promise.all([
      getPendingModeration(),
      getModerationStats(),
    ]);

    const data = moderationResult.success ? moderationResult.data : { pending: [], flagged: [], recentLogs: [] };
    const stats = statsResult.success ? statsResult.stats : {
      pending: 0,
      flagged: 0,
      approved: 0,
      rejected: 0,
      todayActions: 0,
      total: 0,
    };

    return (
      <div className="container mx-auto py-6">
        <ModerationDashboard
          initialData={data ?? { pending: [], flagged: [], recentLogs: [] }}
          initialStats={stats ?? { pending: 0, flagged: 0, approved: 0, rejected: 0, todayActions: 0, total: 0 }}
          userRole={user.role}
        />
      </div>
    );
  } catch (error) {
    redirect("/login");
  }
}
