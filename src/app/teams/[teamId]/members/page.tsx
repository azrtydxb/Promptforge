import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getTeam, getUserTeamRole } from "@/app/actions/team.actions";
import { getTeamMembers, getTeamInvitations } from "@/app/actions/team-members.actions";
import { TeamMembersView } from "@/components/teams/team-members-view";

interface TeamMembersPageProps {
  params: Promise<{
    teamId: string;
  }>;
}

export default async function TeamMembersPage({ params }: TeamMembersPageProps) {
  const user = await requireAuth();
  const { teamId } = await params;
  
  try {
    const team = await getTeam(teamId);
    const userRole = await getUserTeamRole(team.id);
    
    if (!userRole) {
      notFound();
    }
    
    const [members, invitations] = await Promise.all([
      getTeamMembers(team.id),
      getTeamInvitations(team.id).catch(() => []), // Only admins can see invitations
    ]);
    
    return (
      <div className="container py-8">
        <TeamMembersView
          team={team}
          members={members}
          invitations={invitations}
          currentUserId={user.id}
          currentUserRole={userRole}
        />
      </div>
    );
  } catch (error) {
    notFound();
  }
}