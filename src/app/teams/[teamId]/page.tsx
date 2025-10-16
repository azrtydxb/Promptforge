import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getTeam } from "@/app/actions/team.actions";
import { getTeamActivitySummary } from "@/app/actions/team-activity.actions";
import { TeamDashboard } from "@/components/teams/team-dashboard";

export const dynamic = 'force-dynamic';

interface TeamPageProps {
  params: Promise<{
    teamId: string;
  }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const user = await requireAuth();
  const { teamId } = await params;
  
  try {
    const [team, activitySummary] = await Promise.all([
      getTeam(teamId),
      getTeamActivitySummary(teamId),
    ]);

    // Transform team data to match component expectations
    const transformedTeam = {
      ...team,
      description: team.description ?? undefined,
      logo: team.logo ?? undefined,
      _count: {
        members: team.members.length,
        prompts: team._count.prompts,
      },
    };

    // Transform activity summary to ensure metadata is typed correctly
    // Convert JsonValue (which can be null) to Record<string, unknown> | undefined
    const transformedActivitySummary = {
      ...activitySummary,
      recentActivity: activitySummary.recentActivity.map(activity => ({
        ...activity,
        metadata: activity.metadata && typeof activity.metadata === 'object' && !Array.isArray(activity.metadata)
          ? activity.metadata as Record<string, unknown>
          : undefined,
      })),
    };

    return (
      <div className="container py-8">
        <TeamDashboard
          team={transformedTeam}
          activitySummary={transformedActivitySummary}
          currentUserId={user.id}
        />
      </div>
    );
  } catch {
    notFound();
  }
}