import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getTeam, getUserTeamRole, canPerformAction } from "@/app/actions/team.actions";
import { TeamRole } from "@/generated/prisma";

export const dynamic = 'force-dynamic';

interface NewTeamPromptPageProps {
  params: Promise<{
    teamId: string;
  }>;
}

export default async function NewTeamPromptPage({ params }: NewTeamPromptPageProps) {
  await requireAuth();
  const { teamId } = await params;
  
  try {
    const team = await getTeam(teamId);
    const userRole = await getUserTeamRole(team.id);
    
    // Check if user has permission to create prompts
    const canCreate = await canPerformAction(userRole, TeamRole.MEMBER);
    
    if (!canCreate) {
      notFound();
    }
    
    // Redirect to the main prompts page with team context
    // The new prompt form should be handled by the main prompts/new page
    // with team context passed via query params
    redirect(`/prompts/new?teamId=${team.id}`);
    
  } catch {
    notFound();
  }
}