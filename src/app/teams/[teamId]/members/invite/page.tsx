import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getTeam, getUserTeamRole, canPerformAction } from "@/app/actions/team.actions";
import { TeamRole } from "@/generated/prisma";
import { InviteMemberForm } from "@/components/teams/invite-member-form";

export const dynamic = 'force-dynamic';

interface InviteMemberPageProps {
  params: Promise<{
    teamId: string;
  }>;
}

export default async function InviteMemberPage({ params }: InviteMemberPageProps) {
  await requireAuth();
  const { teamId } = await params;
  
  try {
    const team = await getTeam(teamId);
    const userRole = await getUserTeamRole(team.id);
    
    if (!await canPerformAction(userRole, TeamRole.ADMIN)) {
      notFound();
    }
    
    return (
      <div className="container max-w-2xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Invite Team Member</h1>
          <p className="text-muted-foreground mt-2">
            Invite someone to join {team.name} by email.
          </p>
        </div>
        
        <InviteMemberForm teamId={team.id} />
      </div>
    );
  } catch {
    notFound();
  }
}