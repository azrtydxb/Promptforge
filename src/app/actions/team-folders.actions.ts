"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { TeamRole, TeamAction } from "@/generated/prisma";
import { canPerformAction, getUserTeamRole } from "./team.actions";

interface CreateTeamFolderParams {
  teamId: string;
  name: string;
  parentId?: string;
}

export async function createTeamFolder(params: CreateTeamFolderParams) {
  try {
    const user = await requireAuth();
    const userRole = await getUserTeamRole(params.teamId);
    
    if (!canPerformAction(userRole, TeamRole.MEMBER)) {
      throw new Error("Insufficient permissions to create folders");
    }
    
    // Verify parent folder belongs to the team if provided
    if (params.parentId) {
      const parentFolder = await db.teamFolder.findUnique({
        where: { id: params.parentId },
      });
      
      if (!parentFolder || parentFolder.teamId !== params.teamId) {
        throw new Error("Invalid parent folder");
      }
    }
    
    const folder = await db.teamFolder.create({
      data: {
        teamId: params.teamId,
        name: params.name,
        parentId: params.parentId,
      },
    });
    
    // Log the activity
    await db.teamActivity.create({
      data: {
        teamId: params.teamId,
        userId: user.id,
        action: TeamAction.FOLDER_CREATED,
        entityType: 'folder',
        entityId: folder.id,
        entityName: folder.name,
      },
    });
    
    revalidatePath(`/teams/${params.teamId}/prompts`);
    
    logger.info("Team folder created", { 
      folderId: folder.id,
      teamId: params.teamId,
      userId: user.id 
    });
    
    return { success: true, folder };
  } catch (error) {
    logger.error("Error creating team folder", error);
    throw error;
  }
}

interface UpdateTeamFolderParams {
  folderId: string;
  name?: string;
  parentId?: string | null;
}

export async function updateTeamFolder(params: UpdateTeamFolderParams) {
  try {
    const user = await requireAuth();
    
    const folder = await db.teamFolder.findUnique({
      where: { id: params.folderId },
    });
    
    if (!folder) {
      throw new Error("Folder not found");
    }
    
    const userRole = await getUserTeamRole(folder.teamId);
    
    if (!canPerformAction(userRole, TeamRole.MEMBER)) {
      throw new Error("Insufficient permissions to update folders");
    }
    
    // Verify new parent folder belongs to the team if provided
    if (params.parentId !== undefined && params.parentId !== null) {
      const parentFolder = await db.teamFolder.findUnique({
        where: { id: params.parentId },
      });
      
      if (!parentFolder || parentFolder.teamId !== folder.teamId) {
        throw new Error("Invalid parent folder");
      }
      
      // Prevent circular references
      if (params.parentId === params.folderId) {
        throw new Error("A folder cannot be its own parent");
      }
    }
    
    const updatedFolder = await db.teamFolder.update({
      where: { id: params.folderId },
      data: {
        name: params.name,
        parentId: params.parentId,
      },
    });
    
    // Log the activity
    await db.teamActivity.create({
      data: {
        teamId: folder.teamId,
        userId: user.id,
        action: TeamAction.FOLDER_UPDATED,
        entityType: 'folder',
        entityId: folder.id,
        entityName: updatedFolder.name,
      },
    });
    
    revalidatePath(`/teams/${folder.teamId}/prompts`);
    
    logger.info("Team folder updated", { 
      folderId: folder.id,
      teamId: folder.teamId,
      userId: user.id 
    });
    
    return { success: true, folder: updatedFolder };
  } catch (error) {
    logger.error("Error updating team folder", error);
    throw error;
  }
}

export async function deleteTeamFolder(folderId: string) {
  try {
    const user = await requireAuth();
    
    const folder = await db.teamFolder.findUnique({
      where: { id: folderId },
      include: {
        _count: {
          select: {
            prompts: true,
            children: true,
          },
        },
      },
    });
    
    if (!folder) {
      throw new Error("Folder not found");
    }
    
    const userRole = await getUserTeamRole(folder.teamId);
    
    if (!canPerformAction(userRole, TeamRole.MEMBER)) {
      throw new Error("Insufficient permissions to delete folders");
    }
    
    // Check if folder has content
    if (folder._count.prompts > 0 || folder._count.children > 0) {
      throw new Error("Cannot delete folder with content. Please move or delete all prompts and subfolders first.");
    }
    
    await db.teamFolder.delete({
      where: { id: folderId },
    });
    
    // Log the activity
    await db.teamActivity.create({
      data: {
        teamId: folder.teamId,
        userId: user.id,
        action: TeamAction.FOLDER_DELETED,
        entityType: 'folder',
        entityName: folder.name,
      },
    });
    
    revalidatePath(`/teams/${folder.teamId}/prompts`);
    
    logger.info("Team folder deleted", { 
      folderId,
      teamId: folder.teamId,
      userId: user.id 
    });
    
    return { success: true };
  } catch (error) {
    logger.error("Error deleting team folder", error);
    throw error;
  }
}

export async function getTeamFolders(teamId: string) {
  try {
    const user = await requireAuth();
    const userRole = await getUserTeamRole(teamId);
    
    if (!userRole) {
      throw new Error("You are not a member of this team");
    }
    
    const folders = await db.teamFolder.findMany({
      where: { teamId },
      include: {
        _count: {
          select: {
            prompts: true,
            children: true,
          },
        },
      },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' },
      ],
    });
    
    return folders;
  } catch (error) {
    logger.error("Error getting team folders", error);
    throw error;
  }
}

// Team Tags

interface CreateTeamTagParams {
  teamId: string;
  name: string;
  description?: string;
}

export async function createTeamTag(params: CreateTeamTagParams) {
  try {
    const user = await requireAuth();
    const userRole = await getUserTeamRole(params.teamId);
    
    if (!canPerformAction(userRole, TeamRole.MEMBER)) {
      throw new Error("Insufficient permissions to create tags");
    }
    
    const tag = await db.teamTag.create({
      data: {
        teamId: params.teamId,
        name: params.name.toLowerCase(),
        description: params.description,
      },
    });
    
    // Log the activity
    await db.teamActivity.create({
      data: {
        teamId: params.teamId,
        userId: user.id,
        action: TeamAction.TAG_CREATED,
        entityType: 'tag',
        entityId: tag.id,
        entityName: tag.name,
      },
    });
    
    revalidatePath(`/teams/${params.teamId}/tags`);
    
    logger.info("Team tag created", { 
      tagId: tag.id,
      teamId: params.teamId,
      userId: user.id 
    });
    
    return { success: true, tag };
  } catch (error) {
    logger.error("Error creating team tag", error);
    throw error;
  }
}

export async function updateTeamTag(tagId: string, updates: { name?: string; description?: string }) {
  try {
    const user = await requireAuth();
    
    const tag = await db.teamTag.findUnique({
      where: { id: tagId },
    });
    
    if (!tag) {
      throw new Error("Tag not found");
    }
    
    const userRole = await getUserTeamRole(tag.teamId);
    
    if (!canPerformAction(userRole, TeamRole.MEMBER)) {
      throw new Error("Insufficient permissions to update tags");
    }
    
    const updatedTag = await db.teamTag.update({
      where: { id: tagId },
      data: {
        name: updates.name?.toLowerCase(),
        description: updates.description,
      },
    });
    
    // Log the activity
    await db.teamActivity.create({
      data: {
        teamId: tag.teamId,
        userId: user.id,
        action: TeamAction.TAG_UPDATED,
        entityType: 'tag',
        entityId: tag.id,
        entityName: updatedTag.name,
      },
    });
    
    revalidatePath(`/teams/${tag.teamId}/tags`);
    
    logger.info("Team tag updated", { 
      tagId,
      teamId: tag.teamId,
      userId: user.id 
    });
    
    return { success: true, tag: updatedTag };
  } catch (error) {
    logger.error("Error updating team tag", error);
    throw error;
  }
}

export async function deleteTeamTag(tagId: string) {
  try {
    const user = await requireAuth();
    
    const tag = await db.teamTag.findUnique({
      where: { id: tagId },
      include: {
        _count: {
          select: {
            prompts: true,
          },
        },
      },
    });
    
    if (!tag) {
      throw new Error("Tag not found");
    }
    
    const userRole = await getUserTeamRole(tag.teamId);
    
    if (!canPerformAction(userRole, TeamRole.ADMIN)) {
      throw new Error("Insufficient permissions to delete tags");
    }
    
    await db.teamTag.delete({
      where: { id: tagId },
    });
    
    // Log the activity
    await db.teamActivity.create({
      data: {
        teamId: tag.teamId,
        userId: user.id,
        action: TeamAction.TAG_DELETED,
        entityType: 'tag',
        entityName: tag.name,
      },
    });
    
    revalidatePath(`/teams/${tag.teamId}/tags`);
    
    logger.info("Team tag deleted", { 
      tagId,
      teamId: tag.teamId,
      userId: user.id 
    });
    
    return { success: true };
  } catch (error) {
    logger.error("Error deleting team tag", error);
    throw error;
  }
}

export async function getTeamTags(teamId: string) {
  try {
    const user = await requireAuth();
    const userRole = await getUserTeamRole(teamId);
    
    if (!userRole) {
      throw new Error("You are not a member of this team");
    }
    
    const tags = await db.teamTag.findMany({
      where: { teamId },
      include: {
        _count: {
          select: {
            prompts: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
    
    return tags;
  } catch (error) {
    logger.error("Error getting team tags", error);
    throw error;
  }
}