import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getTeam, getTeamPrompts } from "@/app/actions/team.actions";
import { TeamPromptsView } from "@/components/teams/team-prompts-view";

export const dynamic = 'force-dynamic';

interface TeamPromptsPageProps {
  params: Promise<{
    teamId: string;
  }>;
  searchParams: Promise<{
    search?: string;
    page?: string;
    limit?: string;
  }>;
}

export default async function TeamPromptsPage({ params, searchParams }: TeamPromptsPageProps) {
  const user = await requireAuth();
  const { teamId } = await params;
  const { search = "", page = "1", limit = "20" } = await searchParams;
  
  try {
    console.log('TeamPromptsPage - teamId:', teamId);
    const team = await getTeam(teamId);
    console.log('TeamPromptsPage - team found:', team?.id);
    
    // Get team prompts with pagination
    const { prompts, pagination } = await getTeamPrompts(teamId, {
      search,
      page: parseInt(page),
      limit: parseInt(limit),
    });
    
    return (
      <div className="container py-8">
        <TeamPromptsView 
          team={team}
          prompts={prompts}
          pagination={pagination}
          currentUserId={user.id}
          searchQuery={search}
        />
      </div>
    );
  } catch (error) {
    console.error('TeamPromptsPage error:', error);
    notFound();
  }
}