/**
 * Authorization Helpers for Fine-Grained Access Control
 *
 * This module provides reusable authorization functions to ensure
 * proper ownership and permission verification across all server actions.
 */

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { TeamRole, UserRole } from "@/generated/prisma";
import { logger } from "@/lib/logger";

/**
 * Verify that the current user owns a specific prompt
 * @throws Error if user doesn't own the prompt or prompt doesn't exist
 */
export async function requirePromptOwnership(promptId: string) {
  const user = await requireAuth();

  const prompt = await db.prompt.findFirst({
    where: {
      id: promptId,
      userId: user.id,
    },
  });

  if (!prompt) {
    logger.warn("Unauthorized prompt access attempt", {
      userId: user.id,
      promptId
    });
    throw new Error("Prompt not found or unauthorized");
  }

  return { user, prompt };
}

/**
 * Verify that the current user owns a specific folder
 * @throws Error if user doesn't own the folder or folder doesn't exist
 */
export async function requireFolderOwnership(folderId: string) {
  const user = await requireAuth();

  const folder = await db.folder.findFirst({
    where: {
      id: folderId,
      userId: user.id,
    },
  });

  if (!folder) {
    logger.warn("Unauthorized folder access attempt", {
      userId: user.id,
      folderId
    });
    throw new Error("Folder not found or unauthorized");
  }

  return { user, folder };
}

/**
 * Verify that the current user owns a specific shared prompt
 * @throws Error if user doesn't own the shared prompt
 */
export async function requireSharedPromptOwnership(sharedPromptId: string) {
  const user = await requireAuth();

  const sharedPrompt = await db.sharedPrompt.findFirst({
    where: {
      id: sharedPromptId,
      authorId: user.id,
    },
  });

  if (!sharedPrompt) {
    logger.warn("Unauthorized shared prompt access attempt", {
      userId: user.id,
      sharedPromptId
    });
    throw new Error("Shared prompt not found or unauthorized");
  }

  return { user, sharedPrompt };
}

/**
 * Verify that the current user owns a specific collection
 * @throws Error if user doesn't own the collection
 */
export async function requireCollectionOwnership(collectionId: string) {
  const user = await requireAuth();

  const collection = await db.collection.findFirst({
    where: {
      id: collectionId,
      userId: user.id,
    },
  });

  if (!collection) {
    logger.warn("Unauthorized collection access attempt", {
      userId: user.id,
      collectionId
    });
    throw new Error("Collection not found or unauthorized");
  }

  return { user, collection };
}

/**
 * Verify that the current user owns a specific template
 * @throws Error if user doesn't own the template
 */
export async function requireTemplateOwnership(templateId: string) {
  const user = await requireAuth();

  const template = await db.promptTemplate.findFirst({
    where: {
      id: templateId,
      authorId: user.id,
    },
  });

  if (!template) {
    logger.warn("Unauthorized template access attempt", {
      userId: user.id,
      templateId
    });
    throw new Error("Template not found or unauthorized");
  }

  return { user, template };
}

/**
 * Verify that the current user owns a specific draft
 * @throws Error if user doesn't own the draft
 */
export async function requireDraftOwnership(draftId: string) {
  const user = await requireAuth();

  const draft = await db.promptDraft.findFirst({
    where: {
      id: draftId,
      userId: user.id,
    },
  });

  if (!draft) {
    logger.warn("Unauthorized draft access attempt", {
      userId: user.id,
      draftId
    });
    throw new Error("Draft not found or unauthorized");
  }

  return { user, draft };
}

/**
 * Verify that the current user owns a specific comment
 * @throws Error if user doesn't own the comment
 */
export async function requireCommentOwnership(commentId: string) {
  const user = await requireAuth();

  const comment = await db.promptComment.findFirst({
    where: {
      id: commentId,
      userId: user.id,
    },
  });

  if (!comment) {
    logger.warn("Unauthorized comment access attempt", {
      userId: user.id,
      commentId
    });
    throw new Error("Comment not found or unauthorized");
  }

  return { user, comment };
}

/**
 * Verify that the current user has a specific role in a team
 * @param requiredRole Minimum required role (uses hierarchy: OWNER > ADMIN > MEMBER > VIEWER)
 * @throws Error if user doesn't have sufficient permissions
 */
export async function requireTeamRole(
  teamId: string,
  requiredRole: TeamRole
) {
  const user = await requireAuth();

  const member = await db.teamMember.findFirst({
    where: {
      teamId,
      userId: user.id,
    },
  });

  if (!member) {
    logger.warn("User not a team member", {
      userId: user.id,
      teamId
    });
    throw new Error("You are not a member of this team");
  }

  const roleHierarchy: Record<TeamRole, number> = {
    [TeamRole.OWNER]: 4,
    [TeamRole.ADMIN]: 3,
    [TeamRole.MEMBER]: 2,
    [TeamRole.VIEWER]: 1,
  };

  const userRoleLevel = roleHierarchy[member.role];
  const requiredRoleLevel = roleHierarchy[requiredRole];

  if (userRoleLevel < requiredRoleLevel) {
    logger.warn("Insufficient team permissions", {
      userId: user.id,
      teamId,
      userRole: member.role,
      requiredRole
    });
    throw new Error(`Insufficient permissions. Required role: ${requiredRole}`);
  }

  return { user, member };
}

/**
 * Verify that the current user is the owner of a team
 * @throws Error if user is not the team owner
 */
export async function requireTeamOwnership(teamId: string) {
  return requireTeamRole(teamId, TeamRole.OWNER);
}

/**
 * Verify that the current user has admin permissions in a team
 * @throws Error if user doesn't have admin permissions
 */
export async function requireTeamAdmin(teamId: string) {
  return requireTeamRole(teamId, TeamRole.ADMIN);
}

/**
 * Verify that the current user is a member of a team (any role)
 * @throws Error if user is not a team member
 */
export async function requireTeamMembership(teamId: string) {
  return requireTeamRole(teamId, TeamRole.VIEWER);
}

/**
 * Verify that the current user owns a team prompt
 * @throws Error if user doesn't have permission to modify the team prompt
 */
export async function requireTeamPromptPermission(promptId: string) {
  const user = await requireAuth();

  const teamPrompt = await db.teamPrompt.findFirst({
    where: {
      id: promptId,
    },
    include: {
      team: {
        include: {
          members: {
            where: {
              userId: user.id,
            },
          },
        },
      },
    },
  });

  if (!teamPrompt) {
    logger.warn("Team prompt not found", { promptId });
    throw new Error("Team prompt not found");
  }

  if (teamPrompt.team.members.length === 0) {
    logger.warn("User not a team member for prompt", {
      userId: user.id,
      promptId,
      teamId: teamPrompt.teamId
    });
    throw new Error("You are not a member of this team");
  }

  const member = teamPrompt.team.members[0];
  const canModify =
    teamPrompt.createdById === user.id ||
    member.role === TeamRole.OWNER ||
    member.role === TeamRole.ADMIN;

  if (!canModify) {
    logger.warn("Insufficient permissions for team prompt", {
      userId: user.id,
      promptId,
      role: member.role
    });
    throw new Error("Insufficient permissions to modify this team prompt");
  }

  return { user, teamPrompt, member };
}

/**
 * Verify that the current user has moderator permissions
 * @throws Error if user is not a moderator or admin
 */
export async function requireModeratorRole() {
  const user = await requireAuth();

  if (user.role !== UserRole.MODERATOR && user.role !== UserRole.ADMIN) {
    logger.warn("Moderator access denied", {
      userId: user.id,
      userRole: user.role
    });
    throw new Error("Moderator access required");
  }

  return user;
}

/**
 * Verify that the current user has admin permissions
 * @throws Error if user is not an admin
 */
export async function requireAdminRole() {
  const user = await requireAuth();

  if (user.role !== UserRole.ADMIN) {
    logger.warn("Admin access denied", {
      userId: user.id,
      userRole: user.role
    });
    throw new Error("Admin access required");
  }

  return user;
}

/**
 * Verify that the current user can modify another user's data
 * This is typically only allowed for:
 * - The user themselves
 * - Admins (with some restrictions)
 * @throws Error if user doesn't have permission
 */
export async function requireUserModificationPermission(targetUserId: string) {
  const user = await requireAuth();

  // Users can modify their own data
  if (user.id === targetUserId) {
    return { user, isSelf: true };
  }

  // Only admins can modify other users
  if (user.role !== UserRole.ADMIN) {
    logger.warn("Unauthorized user modification attempt", {
      userId: user.id,
      targetUserId
    });
    throw new Error("You can only modify your own account");
  }

  // Admins cannot delete themselves
  // This check should be done in the calling function for delete operations

  return { user, isSelf: false };
}

/**
 * Verify that the current user owns or can access a share link
 * @throws Error if user doesn't have permission
 */
export async function requireShareLinkPermission(shareLinkId: string) {
  const user = await requireAuth();

  const shareLink = await db.promptShareLink.findFirst({
    where: {
      id: shareLinkId,
      prompt: {
        userId: user.id,
      },
    },
  });

  if (!shareLink) {
    logger.warn("Unauthorized share link access attempt", {
      userId: user.id,
      shareLinkId
    });
    throw new Error("Share link not found or unauthorized");
  }

  return { user, shareLink };
}

/**
 * Check if a resource (prompt, folder, etc.) belongs to the current user
 * This is a generic helper for simple ownership checks
 */
export async function isResourceOwner(
  resourceType: 'prompt' | 'folder' | 'collection' | 'template' | 'draft',
  resourceId: string
): Promise<boolean> {
  try {
    const user = await requireAuth();

    let isOwner = false;

    switch (resourceType) {
      case 'prompt':
        const prompt = await db.prompt.findFirst({
          where: { id: resourceId, userId: user.id },
        });
        isOwner = !!prompt;
        break;

      case 'folder':
        const folder = await db.folder.findFirst({
          where: { id: resourceId, userId: user.id },
        });
        isOwner = !!folder;
        break;

      case 'collection':
        const collection = await db.collection.findFirst({
          where: { id: resourceId, userId: user.id },
        });
        isOwner = !!collection;
        break;

      case 'template':
        const template = await db.promptTemplate.findFirst({
          where: { id: resourceId, authorId: user.id },
        });
        isOwner = !!template;
        break;

      case 'draft':
        const draft = await db.promptDraft.findFirst({
          where: { id: resourceId, userId: user.id },
        });
        isOwner = !!draft;
        break;
    }

    return isOwner;
  } catch {
    return false;
  }
}

/**
 * Log security events for audit trail
 */
export async function logSecurityEvent(
  eventType: 'ACCESS_DENIED' | 'PERMISSION_VIOLATION' | 'SUSPICIOUS_ACTIVITY',
  details: {
    userId: string;
    resource?: string;
    resourceId?: string;
    action?: string;
    reason?: string;
  }
) {
  logger.warn(`Security Event: ${eventType}`, details);

  // In a production system, you might also want to:
  // - Store these events in a security audit table
  // - Send alerts for critical violations
  // - Track patterns for abuse detection
}