import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { TeamsView } from "@/components/teams/teams-view";

// Keep force-dynamic to prevent Turbopack font loading issues
export const dynamic = 'force-dynamic';

// Cache the teams data function with React cache for request-level memoization
const getTeamsData = cache(async (userId: string) => {
  const teams = await db.teamMember.findMany({
    where: { 
      userId,
      team: {
        isActive: true
      }
    },
    include: {
      team: {
        include: {
          _count: {
            select: {
              members: true,
              prompts: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              username: true
            }
          }
        }
      }
    },
    orderBy: {
      joinedAt: 'desc'
    }
  });

  // Transform the data to a more convenient format
  const teamsWithRole = teams.map(member => ({
    id: member.team.id,
    name: member.team.name,
    slug: member.team.slug,
    description: member.team.description,
    logo: member.team.logo,
    memberCount: member.team._count.members,
    promptCount: member.team._count.prompts,
    role: member.role,
    joinedAt: member.joinedAt,
    createdBy: member.team.createdBy,
    isOwner: member.team.createdById === userId
  }));

  return {
    teams: teamsWithRole,
    totalTeams: teamsWithRole.length
  };
});

// Create a cached version using unstable_cache for longer-term caching
const getCachedTeamsData = unstable_cache(
  async (userId: string) => {
    return await getTeamsData(userId);
  },
  ['teams-data'],
  {
    revalidate: 300, // 5 minutes
    tags: ['teams', 'user-teams']
  }
);

export default async function TeamsPage() {
  try {
    const user = await requireAuth();
    const teamsData = await getCachedTeamsData(user.id);

    return <TeamsView data={teamsData} />;
  } catch {
    redirect("/sign-in");
  }
}