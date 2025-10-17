"use server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";

export async function getPromptVersions(promptId: string) {
  try {
    const user = await requireAuth();
    if (!user?.id) {
      throw new Error("Unauthorized");
    }

    // Verify the user owns the prompt
    const prompt = await db.prompt.findFirst({
      where: {
        id: promptId,
        userId: user.id
      }
    });

    if (!prompt) {
      throw new Error("Prompt not found or unauthorized");
    }

    // Get all versions for this prompt
    const versions = await db.promptVersion.findMany({
      where: { promptId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        version: true,
        changeMessage: true,
        createdAt: true
      }
    });

    return versions;
  } catch (_error) {
    logger.error("Error fetching prompt versions", { _error, promptId });
    throw _error;
  }
}

export async function createPromptVersion(
  promptId: string,
  content: string,
  changeMessage?: string
) {
  try {
    const user = await requireAuth();
    if (!user?.id) {
      throw new Error("Unauthorized");
    }

    // Verify the user owns the prompt
    const prompt = await db.prompt.findFirst({
      where: {
        id: promptId,
        userId: user.id
      }
    });

    if (!prompt) {
      throw new Error("Prompt not found or unauthorized");
    }

    // Get the last version to calculate next version number
    const lastVersion = await db.promptVersion.findFirst({
      where: { promptId },
      orderBy: { createdAt: 'desc' }
    });

    let newVersionNumber: string;
    if (lastVersion?.version) {
      const [major, minor] = lastVersion.version.split('.').map(Number);
      // Default to minor increment if not specified
      newVersionNumber = `${major}.${minor + 1}`;
    } else {
      newVersionNumber = '1.0';
    }

    // Create the new version
    const version = await db.promptVersion.create({
      data: {
        promptId,
        content,
        version: newVersionNumber,
        changeMessage
      }
    });

    logger.info("Prompt version created", { 
      promptId, 
      versionId: version.id,
      version: version.version 
    });

    revalidatePath(`/prompts/${promptId}`);
    
    return version;
  } catch (_error) {
    logger.error("Error creating prompt version", { _error, promptId });
    throw _error;
  }
}

export async function restorePromptVersion(promptId: string, versionId: string) {
  try {
    const user = await requireAuth();
    if (!user?.id) {
      throw new Error("Unauthorized");
    }

    // Verify the user owns the prompt and get the version
    const version = await db.promptVersion.findFirst({
      where: {
        id: versionId,
        prompt: {
          id: promptId,
          userId: user.id
        }
      }
    });

    if (!version) {
      throw new Error("Version not found or unauthorized");
    }

    // Create a backup of the current content as a new version
    const currentPrompt = await db.prompt.findUnique({
      where: { id: promptId },
      select: { content: true }
    });

    if (currentPrompt?.content && currentPrompt.content !== version.content) {
      await createPromptVersion(
        promptId,
        currentPrompt.content,
        "Backup before restore"
      );
    }

    // Update the prompt with the version content
    await db.prompt.update({
      where: { id: promptId },
      data: { 
        content: version.content,
        updatedAt: new Date()
      }
    });

    logger.info("Prompt version restored", { 
      promptId, 
      versionId,
      restoredVersion: version.version 
    });

    revalidatePath(`/prompts/${promptId}`);
    
    return { success: true, restoredVersion: version.version };
  } catch (_error) {
    logger.error("Error restoring prompt version", { _error, promptId, versionId });
    throw _error;
  }
}

export async function deletePromptVersion(promptId: string, versionId: string) {
  try {
    const user = await requireAuth();
    if (!user?.id) {
      throw new Error("Unauthorized");
    }

    // Verify the user owns the prompt
    const version = await db.promptVersion.findFirst({
      where: {
        id: versionId,
        prompt: {
          id: promptId,
          userId: user.id
        }
      }
    });

    if (!version) {
      throw new Error("Version not found or unauthorized");
    }

    // Don't allow deleting if it's the only version
    const versionCount = await db.promptVersion.count({
      where: { promptId }
    });

    if (versionCount <= 1) {
      throw new Error("Cannot delete the last version");
    }

    await db.promptVersion.delete({
      where: { id: versionId }
    });

    logger.info("Prompt version deleted", { 
      promptId, 
      versionId,
      deletedVersion: version.version 
    });

    revalidatePath(`/prompts/${promptId}`);
    
    return { success: true };
  } catch (_error) {
    logger.error("Error deleting prompt version", { _error, promptId, versionId });
    throw _error;
  }
}

export async function comparePromptVersions(versionId1: string, versionId2: string) {
  try {
    const user = await requireAuth();
    if (!user?.id) {
      throw new Error("Unauthorized");
    }

    // Get both versions and verify ownership
    const [version1, version2] = await Promise.all([
      db.promptVersion.findFirst({
        where: {
          id: versionId1,
          prompt: { userId: user.id }
        }
      }),
      db.promptVersion.findFirst({
        where: {
          id: versionId2,
          prompt: { userId: user.id }
        }
      })
    ]);

    if (!version1 || !version2) {
      throw new Error("One or both versions not found or unauthorized");
    }

    if (version1.promptId !== version2.promptId) {
      throw new Error("Versions must be from the same prompt");
    }

    return {
      version1: {
        id: version1.id,
        version: version1.version,
        content: version1.content,
        createdAt: version1.createdAt,
        changeMessage: version1.changeMessage
      },
      version2: {
        id: version2.id,
        version: version2.version,
        content: version2.content,
        createdAt: version2.createdAt,
        changeMessage: version2.changeMessage
      }
    };
  } catch (_error) {
    logger.error("Error comparing prompt versions", { _error, versionId1, versionId2 });
    throw _error;
  }
}