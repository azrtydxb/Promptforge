import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getTeam } from "@/app/actions/team.actions";
import { getTeamActivitySummary } from "@/app/actions/team-activity.actions";
import { TeamDashboard } from "@/components/teams/team-dashboard";

interface TeamPageProps {
  params: Promise<{
    teamSlug: string;
  }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const user = await requireAuth();
  const { teamSlug } = await params;
  
  try {
    const [team, activitySummary] = await Promise.all([
      getTeam(teamSlug),
      getTeamActivitySummary(teamSlug),
    ]);
    
    return (
      <div className="container py-8">
        <TeamDashboard 
          team={team} 
          activitySummary={activitySummary}
          currentUserId={user.id}
        />
      </div>
    );
  } catch (error) {
    notFound();
  }
}