"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { TeamRole, TeamAction } from "@/generated/prisma";
import { canPerformAction, getUserTeamRole } from "./team.actions";

// Team Prompt Management

interface CreateTeamPromptParams {
  teamId: string;
  title: string;
  description?: string;
  content?: string;
  folderId?: string;
  tagIds?: string[];
}

export async function createTeamPrompt(params: CreateTeamPromptParams) {
  try {
    const user = await requireAuth();
    const userRole = await getUserTeamRole(params.teamId);
    
    // Check if user has permission to create prompts
    if (!canPerformAction(userRole, TeamRole.MEMBER)) {
      throw new Error("Insufficient permissions to create prompts");
    }
    
    // Verify folder belongs to the team if provided
    if (params.folderId) {
      const folder = await db.teamFolder.findUnique({
        where: { id: params.folderId },
      });
      
      if (!folder || folder.teamId !== params.teamId) {
        throw new Error("Invalid folder");
      }
    }
    
    // Create the prompt
    const prompt = await db.teamPrompt.create({
      data: {
        teamId: params.teamId,
        title: params.title,
        description: params.description,
        content: params.content,
        createdById: user.id,
        folderId: params.folderId,
        tags: params.tagIds ? {
          connect: params.tagIds.map(id => ({ id })),
        } : undefined,
      },
      include: {
        createdBy: true,
        folder: true,
        tags: true,
      },
    });
    
    // Log the activity
    await db.teamActivity.create({
      data: {
        teamId: params.teamId,
        userId: user.id,
        action: TeamAction.PROMPT_CREATED,
        entityType: 'prompt',
        entityId: prompt.id,
        entityName: prompt.title,
      },
    });
    
    revalidatePath(`/teams/${params.teamId}/prompts`);
    
    logger.info("Team prompt created", { 
      promptId: prompt.id,
      teamId: params.teamId,
      userId: user.id 
    });
    
    return { success: true, prompt };
  } catch (error) {
    logger.error("Error creating team prompt", error);
    throw error;
  }
}

interface UpdateTeamPromptParams {
  promptId: string;
  title?: string;
  description?: string;
  content?: string;
  folderId?: string | null;
  tagIds?: string[];
}

export async function updateTeamPrompt(params: UpdateTeamPromptParams) {
  try {
    const user = await requireAuth();
    
    // Get the prompt to check permissions
    const prompt = await db.teamPrompt.findUnique({
      where: { id: params.promptId },
      include: { team: true },
    });
    
    if (!prompt) {
      throw new Error("Prompt not found");
    }
    
    const userRole = await getUserTeamRole(prompt.teamId);
    
    // Check if user has permission to update
    const isCreator = prompt.createdById === user.id;
    const canEdit = isCreator || canPerformAction(userRole, TeamRole.ADMIN);
    
    if (!canEdit) {
      throw new Error("Insufficient permissions to update this prompt");
    }
    
    // Verify folder belongs to the team if provided
    if (params.folderId !== undefined && params.folderId !== null) {
      const folder = await db.teamFolder.findUnique({
        where: { id: params.folderId },
      });
      
      if (!folder || folder.teamId !== prompt.teamId) {
        throw new Error("Invalid folder");
      }
    }
    
    // Update the prompt
    const updatedPrompt = await db.teamPrompt.update({
      where: { id: params.promptId },
      data: {
        title: params.title,
        description: params.description,
        content: params.content,
        folderId: params.folderId,
        tags: params.tagIds !== undefined ? {
          set: params.tagIds.map(id => ({ id })),
        } : undefined,
      },
      include: {
        createdBy: true,
        folder: true,
        tags: true,
      },
    });
    
    // Log the activity
    await db.teamActivity.create({
      data: {
        teamId: prompt.teamId,
        userId: user.id,
        action: TeamAction.PROMPT_UPDATED,
        entityType: 'prompt',
        entityId: prompt.id,
        entityName: updatedPrompt.title,
      },
    });
    
    revalidatePath(`/teams/${prompt.teamId}/prompts`);
    revalidatePath(`/teams/${prompt.teamId}/prompts/${prompt.id}`);
    
    logger.info("Team prompt updated", { 
      promptId: prompt.id,
      teamId: prompt.teamId,
      userId: user.id 
    });
    
    return { success: true, prompt: updatedPrompt };
  } catch (error) {
    logger.error("Error updating team prompt", error);
    throw error;
  }
}

export async function deleteTeamPrompt(promptId: string) {
  try {
    const user = await requireAuth();
    
    // Get the prompt to check permissions
    const prompt = await db.teamPrompt.findUnique({
      where: { id: promptId },
    });
    
    if (!prompt) {
      throw new Error("Prompt not found");
    }
    
    const userRole = await getUserTeamRole(prompt.teamId);
    
    // Check if user has permission to delete
    const isCreator = prompt.createdById === user.id;
    const canDelete = isCreator || canPerformAction(userRole, TeamRole.ADMIN);
    
    if (!canDelete) {
      throw new Error("Insufficient permissions to delete this prompt");
    }
    
    // Delete the prompt
    await db.teamPrompt.delete({
      where: { id: promptId },
    });
    
    // Log the activity
    await db.teamActivity.create({
      data: {
        teamId: prompt.teamId,
        userId: user.id,
        action: TeamAction.PROMPT_DELETED,
        entityType: 'prompt',
        entityName: prompt.title,
      },
    });
    
    revalidatePath(`/teams/${prompt.teamId}/prompts`);
    
    logger.info("Team prompt deleted", { 
      promptId,
      teamId: prompt.teamId,
      userId: user.id 
    });
    
    return { success: true };
  } catch (error) {
    logger.error("Error deleting team prompt", error);
    throw error;
  }
}

export async function archiveTeamPrompt(promptId: string) {
  try {
    const user = await requireAuth();
    
    // Get the prompt to check permissions
    const prompt = await db.teamPrompt.findUnique({
      where: { id: promptId },
    });
    
    if (!prompt) {
      throw new Error("Prompt not found");
    }
    
    const userRole = await getUserTeamRole(prompt.teamId);
    
    // Check if user has permission
    const isCreator = prompt.createdById === user.id;
    const canArchive = isCreator || canPerformAction(userRole, TeamRole.ADMIN);
    
    if (!canArchive) {
      throw new Error("Insufficient permissions to archive this prompt");
    }
    
    // Archive/unarchive the prompt
    const updatedPrompt = await db.teamPrompt.update({
      where: { id: promptId },
      data: { isArchived: !prompt.isArchived },
    });
    
    // Log the activity
    await db.teamActivity.create({
      data: {
        teamId: prompt.teamId,
        userId: user.id,
        action: updatedPrompt.isArchived ? TeamAction.PROMPT_ARCHIVED : TeamAction.PROMPT_RESTORED,
        entityType: 'prompt',
        entityId: prompt.id,
        entityName: prompt.title,
      },
    });
    
    revalidatePath(`/teams/${prompt.teamId}/prompts`);
    
    logger.info("Team prompt archived status changed", { 
      promptId,
      teamId: prompt.teamId,
      isArchived: updatedPrompt.isArchived 
    });
    
    return { success: true, prompt: updatedPrompt };
  } catch (error) {
    logger.error("Error archiving team prompt", error);
    throw error;
  }
}

interface GetTeamPromptsParams {
  teamId: string;
  includeArchived?: boolean;
  folderId?: string;
  tagIds?: string[];
}

export async function getTeamPrompts(params: GetTeamPromptsParams) {
  try {
    const user = await requireAuth();
    const userRole = await getUserTeamRole(params.teamId);
    
    if (!userRole) {
      throw new Error("You are not a member of this team");
    }
    
    const where: any = {
      teamId: params.teamId,
    };
    
    if (!params.includeArchived) {
      where.isArchived = false;
    }
    
    if (params.folderId) {
      where.folderId = params.folderId;
    }
    
    if (params.tagIds && params.tagIds.length > 0) {
      where.tags = {
        some: {
          id: { in: params.tagIds },
        },
      };
    }
    
    const prompts = await db.teamPrompt.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        folder: true,
        tags: true,
        _count: {
          select: {
            versions: true,
          },
        },
      },
      orderBy: [
        { pinnedAt: 'desc' },
        { lastUsedAt: 'desc' },
        { updatedAt: 'desc' },
      ],
    });
    
    return prompts;
  } catch (error) {
    logger.error("Error getting team prompts", error);
    throw error;
  }
}

export async function getTeamPrompt(promptId: string) {
  try {
    const user = await requireAuth();
    
    const prompt = await db.teamPrompt.findUnique({
      where: { id: promptId },
      include: {
        team: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
        folder: true,
        tags: true,
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    
    if (!prompt) {
      throw new Error("Prompt not found");
    }
    
    const userRole = await getUserTeamRole(prompt.teamId);
    
    if (!userRole) {
      throw new Error("You are not a member of this team");
    }
    
    // Update view count and last used
    await db.teamPrompt.update({
      where: { id: promptId },
      data: {
        viewCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
    
    return prompt;
  } catch (error) {
    logger.error("Error getting team prompt", error);
    throw error;
  }
}

export async function pinTeamPrompt(promptId: string) {
  try {
    const user = await requireAuth();
    
    const prompt = await db.teamPrompt.findUnique({
      where: { id: promptId },
    });
    
    if (!prompt) {
      throw new Error("Prompt not found");
    }
    
    const userRole = await getUserTeamRole(prompt.teamId);
    
    if (!canPerformAction(userRole, TeamRole.MEMBER)) {
      throw new Error("Insufficient permissions");
    }
    
    const updatedPrompt = await db.teamPrompt.update({
      where: { id: promptId },
      data: {
        pinnedAt: prompt.pinnedAt ? null : new Date(),
      },
    });
    
    revalidatePath(`/teams/${prompt.teamId}/prompts`);
    
    return { success: true, prompt: updatedPrompt };
  } catch (error) {
    logger.error("Error pinning team prompt", error);
    throw error;
  }
}

// Copy a team prompt to personal library
export async function copyTeamPromptToPersonal(promptId: string) {
  try {
    const user = await requireAuth();
    
    const teamPrompt = await db.teamPrompt.findUnique({
      where: { id: promptId },
      include: {
        tags: true,
      },
    });
    
    if (!teamPrompt) {
      throw new Error("Prompt not found");
    }
    
    const userRole = await getUserTeamRole(teamPrompt.teamId);
    
    if (!userRole) {
      throw new Error("You are not a member of this team");
    }
    
    // Create personal prompt
    const personalPrompt = await db.prompt.create({
      data: {
        userId: user.id,
        title: teamPrompt.title,
        description: teamPrompt.description,
        content: teamPrompt.content,
        enhancedContent: teamPrompt.enhancedContent,
        enhancementSuggestions: teamPrompt.enhancementSuggestions,
        autoTags: teamPrompt.autoTags,
      },
    });
    
    // Update copy count
    await db.teamPrompt.update({
      where: { id: promptId },
      data: { copyCount: { increment: 1 } },
    });
    
    revalidatePath('/dashboard');
    
    logger.info("Team prompt copied to personal library", { 
      teamPromptId: promptId,
      personalPromptId: personalPrompt.id,
      userId: user.id 
    });
    
    return { success: true, prompt: personalPrompt };
  } catch (error) {
    logger.error("Error copying team prompt", error);
    throw error;
  }
}