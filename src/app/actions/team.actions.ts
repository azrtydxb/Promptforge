"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { TeamRole, TeamAction } from "@/generated/prisma";

// Team CRUD Operations

interface CreateTeamParams {
  name: string;
  description?: string;
  logo?: string;
}

export async function createTeam(params: CreateTeamParams) {
  try {
    const user = await requireAuth();
    
    // Generate a URL-friendly slug from the team name
    const baseSlug = params.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Ensure slug is unique
    let slug = baseSlug;
    let counter = 1;
    while (await db.team.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    // Create the team with the user as owner
    const team = await db.team.create({
      data: {
        name: params.name,
        description: params.description,
        logo: params.logo,
        slug,
        createdById: user.id,
        members: {
          create: {
            userId: user.id,
            role: TeamRole.OWNER,
          },
        },
        activities: {
          create: {
            userId: user.id,
            action: TeamAction.TEAM_CREATED,
            entityType: 'team',
            metadata: {
              teamName: params.name,
            },
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });
    
    revalidatePath('/dashboard');
    revalidatePath('/teams');
    
    logger.info("Team created", { teamId: team.id, userId: user.id });
    return { success: true, team };
  } catch (error) {
    logger.error("Error creating team", error);
    throw new Error("Failed to create team");
  }
}

interface UpdateTeamParams {
  teamId: string;
  name?: string;
  description?: string;
  logo?: string;
  settings?: Record<string, unknown>;
}

export async function updateTeam(params: UpdateTeamParams) {
  try {
    const user = await requireAuth();
    
    // Check if user has permission to update the team
    const member = await db.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: params.teamId,
          userId: user.id,
        },
      },
    });
    
    if (!member || (member.role !== TeamRole.OWNER && member.role !== TeamRole.ADMIN)) {
      throw new Error("Insufficient permissions to update team");
    }
    
    const updateData: any = {};
    if (params.name !== undefined) updateData.name = params.name;
    if (params.description !== undefined) updateData.description = params.description;
    if (params.logo !== undefined) updateData.logo = params.logo;
    if (params.settings !== undefined) updateData.settings = params.settings;
    
    const team = await db.team.update({
      where: { id: params.teamId },
      data: updateData,
    });
    
    // Log the activity
    await db.teamActivity.create({
      data: {
        teamId: params.teamId,
        userId: user.id,
        action: TeamAction.TEAM_UPDATED,
        entityType: 'team',
        entityId: params.teamId,
        metadata: {
          changes: Object.keys(updateData),
        },
      },
    });
    
    revalidatePath('/dashboard');
    revalidatePath(`/teams/${team.slug}`);
    
    logger.info("Team updated", { teamId: team.id, userId: user.id });
    return { success: true, team };
  } catch (error) {
    logger.error("Error updating team", error);
    throw error;
  }
}

export async function deleteTeam(teamId: string) {
  try {
    const user = await requireAuth();
    
    // Check if user is the owner of the team
    const member = await db.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.id,
        },
      },
    });
    
    if (!member || member.role !== TeamRole.OWNER) {
      throw new Error("Only team owners can delete teams");
    }
    
    // Delete the team (cascading deletes will handle related records)
    await db.team.delete({
      where: { id: teamId },
    });
    
    revalidatePath('/dashboard');
    revalidatePath('/teams');
    
    logger.info("Team deleted", { teamId, userId: user.id });
    return { success: true };
  } catch (error) {
    logger.error("Error deleting team", error);
    throw error;
  }
}

export async function getTeam(teamIdOrSlug: string) {
  try {
    const user = await requireAuth();
    
    // Try to find by ID first, then by slug
    let team = await db.team.findUnique({
      where: { id: teamIdOrSlug },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        _count: {
          select: {
            prompts: true,
            folders: true,
            tags: true,
          },
        },
      },
    });
    
    if (!team) {
      team = await db.team.findUnique({
        where: { slug: teamIdOrSlug },
        include: {
          members: {
            include: {
              user: true,
            },
          },
          _count: {
            select: {
              prompts: true,
              folders: true,
              tags: true,
            },
          },
        },
      });
    }
    
    if (!team) {
      throw new Error("Team not found");
    }
    
    // Check if user is a member of the team
    const isMember = team.members.some(member => member.userId === user.id);
    if (!isMember) {
      throw new Error("You are not a member of this team");
    }
    
    return team;
  } catch (error) {
    logger.error("Error getting team", error);
    throw error;
  }
}

export async function getUserTeams() {
  try {
    const user = await requireAuth();
    
    const teams = await db.team.findMany({
      where: {
        members: {
          some: {
            userId: user.id,
          },
        },
        isActive: true,
      },
      include: {
        members: {
          where: {
            userId: user.id,
          },
        },
        _count: {
          select: {
            members: true,
            prompts: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return teams;
  } catch (error) {
    logger.error("Error getting user teams", error);
    throw error;
  }
}

// Team member role check helper
export async function getUserTeamRole(teamId: string, userId?: string) {
  try {
    const user = await requireAuth();
    const targetUserId = userId || user.id;
    
    const member = await db.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId,
        },
      },
    });
    
    return member?.role || null;
  } catch (error) {
    logger.error("Error getting user team role", error);
    return null;
  }
}

// Check if user can perform an action based on their role
export function canPerformAction(userRole: TeamRole | null, requiredRole: TeamRole): boolean {
  if (!userRole) return false;
  
  const roleHierarchy = {
    [TeamRole.OWNER]: 4,
    [TeamRole.ADMIN]: 3,
    [TeamRole.MEMBER]: 2,
    [TeamRole.VIEWER]: 1,
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}