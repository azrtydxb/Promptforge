import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getTeam, getUserTeamRole } from "@/app/actions/team.actions";
import { getTeamActivityLog } from "@/app/actions/team-activity.actions";
import { TeamActivityView } from "@/components/teams/team-activity-view";

interface TeamActivityPageProps {
  params: Promise<{
    teamId: string;
  }>;
  searchParams: Promise<{
    page?: string;
    limit?: string;
  }>;
}

export default async function TeamActivityPage({ 
  params, 
  searchParams 
}: TeamActivityPageProps) {
  const user = await requireAuth();
  const { teamId } = await params;
  const { page = "1", limit = "50" } = await searchParams;
  
  try {
    const [team, userRole] = await Promise.all([
      getTeam(teamId),
      getUserTeamRole(teamId)
    ]);
    
    if (!userRole) {
      notFound();
    }
    
    // Get activity log with pagination
    const { activities, pagination } = await getTeamActivityLog(teamId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });
    
    return (
      <div className="container py-8">
        <TeamActivityView 
          team={team}
          activities={activities}
          pagination={pagination}
          currentUserId={user.id}
        />
      </div>
    );
  } catch (error) {
    notFound();
  }
}