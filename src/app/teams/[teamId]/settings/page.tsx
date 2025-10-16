import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getTeam, getUserTeamRole, canPerformAction } from "@/app/actions/team.actions";
import { TeamRole } from "@/generated/prisma";
import { TeamSettingsForm } from "@/components/teams/team-settings-form";

export const dynamic = 'force-dynamic';

interface TeamSettingsPageProps {
  params: Promise<{
    teamId: string;
  }>;
}

export default async function TeamSettingsPage({ params }: TeamSettingsPageProps) {
  const user = await requireAuth();
  const { teamId } = await params;
  
  try {
    const team = await getTeam(teamId);
    const userRole = await getUserTeamRole(team.id, user.id);
    
    // Check if user has admin or owner permissions
    const canEdit = await canPerformAction(userRole, TeamRole.ADMIN);
    
    if (!canEdit) {
      redirect(`/teams/${teamId}`);
    }
    
    const currentMember = team.members.find(member => member.userId === user.id);
    const isOwner = currentMember?.role === TeamRole.OWNER;
    
    return (
      <div className="container py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Team Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your team&apos;s settings and preferences
          </p>
        </div>
        
        <TeamSettingsForm 
          team={team} 
          isOwner={isOwner}
          currentUserId={user.id}
        />
      </div>
    );
  } catch {
    notFound();
  }
}