"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getUserTeamRole } from "./team.actions";
import { TeamAction } from "@/generated/prisma";

interface GetTeamActivityParams {
  teamId: string;
  limit?: number;
  offset?: number;
  action?: TeamAction;
  userId?: string;
  entityType?: string;
}

export async function getTeamActivity(params: GetTeamActivityParams) {
  try {
    const user = await requireAuth();
    const userRole = await getUserTeamRole(params.teamId);
    
    if (!userRole) {
      throw new Error("You are not a member of this team");
    }
    
    const where: any = {
      teamId: params.teamId,
    };
    
    if (params.action) {
      where.action = params.action;
    }
    
    if (params.userId) {
      where.userId = params.userId;
    }
    
    if (params.entityType) {
      where.entityType = params.entityType;
    }
    
    const activities = await db.teamActivity.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: params.limit || 50,
      skip: params.offset || 0,
    });
    
    const total = await db.teamActivity.count({ where });
    
    return {
      activities,
      total,
      hasMore: (params.offset || 0) + activities.length < total,
    };
  } catch (error) {
    logger.error("Error getting team activity", error);
    throw error;
  }
}

export async function getTeamActivitySummary(teamIdOrSlug: string) {
  try {
    const user = await requireAuth();
    
    // Get the team to ensure we have the correct ID
    const team = await db.team.findFirst({
      where: {
        OR: [
          { id: teamIdOrSlug },
          { slug: teamIdOrSlug }
        ]
      }
    });
    
    if (!team) {
      throw new Error("Team not found");
    }
    
    const userRole = await getUserTeamRole(team.id);
    
    if (!userRole) {
      throw new Error("You are not a member of this team");
    }
    
    const teamId = team.id;
    
    // Get activity counts for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activityCounts = await db.teamActivity.groupBy({
      by: ['action'],
      where: {
        teamId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      _count: true,
    });
    
    // Get most active users
    const activeUsers = await db.teamActivity.groupBy({
      by: ['userId'],
      where: {
        teamId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      _count: true,
      orderBy: {
        _count: {
          userId: 'desc',
        },
      },
      take: 5,
    });
    
    // Get user details for active users
    const userIds = activeUsers.map(au => au.userId);
    const users = await db.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
      },
    });
    
    const userMap = new Map(users.map(u => [u.id, u]));
    const activeUsersWithDetails = activeUsers.map(au => ({
      user: userMap.get(au.userId),
      activityCount: au._count,
    }));
    
    // Get recent activity
    const recentActivity = await db.teamActivity.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });
    
    return {
      activityCounts: activityCounts.reduce((acc, item) => {
        acc[item.action] = item._count;
        return acc;
      }, {} as Record<TeamAction, number>),
      activeUsers: activeUsersWithDetails,
      recentActivity,
    };
  } catch (error) {
    logger.error("Error getting team activity summary", error);
    throw error;
  }
}

// Helper function to format activity messages
export async function formatActivityMessage(activity: any): Promise<string> {
  const userName = activity.user?.name || activity.user?.username || "Someone";
  
  switch (activity.action) {
    case TeamAction.TEAM_CREATED:
      return `${userName} created the team`;
    case TeamAction.TEAM_UPDATED:
      return `${userName} updated team settings`;
    case TeamAction.MEMBER_INVITED:
      return `${userName} invited ${activity.metadata?.email} to join`;
    case TeamAction.MEMBER_JOINED:
      return `${userName} joined the team`;
    case TeamAction.MEMBER_LEFT:
      return `${userName} left the team`;
    case TeamAction.MEMBER_REMOVED:
      return `${userName} removed ${activity.entityName} from the team`;
    case TeamAction.MEMBER_ROLE_CHANGED:
      return `${userName} changed ${activity.entityName}'s role to ${activity.metadata?.newRole}`;
    case TeamAction.PROMPT_CREATED:
      return `${userName} created prompt "${activity.entityName}"`;
    case TeamAction.PROMPT_UPDATED:
      return `${userName} updated prompt "${activity.entityName}"`;
    case TeamAction.PROMPT_DELETED:
      return `${userName} deleted prompt "${activity.entityName}"`;
    case TeamAction.PROMPT_ARCHIVED:
      return `${userName} archived prompt "${activity.entityName}"`;
    case TeamAction.PROMPT_RESTORED:
      return `${userName} restored prompt "${activity.entityName}"`;
    case TeamAction.FOLDER_CREATED:
      return `${userName} created folder "${activity.entityName}"`;
    case TeamAction.FOLDER_UPDATED:
      return `${userName} updated folder "${activity.entityName}"`;
    case TeamAction.FOLDER_DELETED:
      return `${userName} deleted folder "${activity.entityName}"`;
    case TeamAction.TAG_CREATED:
      return `${userName} created tag "${activity.entityName}"`;
    case TeamAction.TAG_UPDATED:
      return `${userName} updated tag "${activity.entityName}"`;
    case TeamAction.TAG_DELETED:
      return `${userName} deleted tag "${activity.entityName}"`;
    default:
      return `${userName} performed an action`;
  }
}