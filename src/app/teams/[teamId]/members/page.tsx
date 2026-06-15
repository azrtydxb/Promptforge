import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getTeam, getUserTeamRole } from "@/app/actions/team.actions";
import { getTeamMembers, getTeamInvitations } from "@/app/actions/team-members.actions";
import { TeamMembersView } from "@/components/teams/team-members-view";
import { db } from "@/lib/db";

export const dynamic = 'force-dynamic';

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
    
    const [members, invitations, subscription] = await Promise.all([
      getTeamMembers(team.id),
      getTeamInvitations(team.id).catch(() => []), // Only admins can see invitations
      db.subscription.findUnique({ where: { teamId: team.id } }).catch(() => null),
    ]);

    const teamWithSeats = {
      ...team,
      seatsTotal: subscription?.seatsTotal,
      seatsUsed: subscription?.seatsUsed,
    };

    // Map invitations to ensure invitedBy.email is not null
    const validInvitations = invitations.map(inv => ({
      ...inv,
      invitedBy: {
        ...inv.invitedBy,
        email: inv.invitedBy.email || '',
      },
    }));

    return (
      <div className="container py-8">
        <TeamMembersView
          team={teamWithSeats}
          members={members}
          invitations={validInvitations}
          currentUserId={user.id}
          currentUserRole={userRole}
        />
      </div>
    );
  } catch {
    notFound();
  }
}