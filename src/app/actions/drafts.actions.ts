"use server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { z } from "zod";

// Validation schema
const draftSchema = z.object({
  promptId: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  content: z.string().optional(),
  folderId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Save or update a draft
 */
export async function saveDraft(input: z.infer<typeof draftSchema>) {
  try {
    const user = await requireAuth();
    const validated = draftSchema.parse(input);

    // Check if draft exists for this prompt
    let draft;

    if (validated.promptId) {
      draft = await db.promptDraft.findFirst({
        where: {
          userId: user.id,
          promptId: validated.promptId,
        },
      });
    }

    if (draft) {
      // Update existing draft
      // First disconnect all existing tags
      await db.promptDraft.update({
        where: { id: draft.id },
        data: {
          tags: {
            set: [], // Clear all existing tag connections
          },
        },
      });

      // Then update with new data and connect tags
      const tagConnections = validated.tags
        ? await Promise.all(
            validated.tags.map(async (tagName) => {
              // Find or create tag
              let tag = await db.tag.findFirst({
                where: { name: tagName },
              });

              if (!tag) {
                tag = await db.tag.create({
                  data: { name: tagName },
                });
              }

              return { id: tag.id };
            })
          )
        : [];

      draft = await db.promptDraft.update({
        where: { id: draft.id },
        data: {
          title: validated.title,
          description: validated.description,
          content: validated.content,
          folderId: validated.folderId,
          tags: {
            connect: tagConnections,
          },
        },
      });
    } else {
      // Create new draft
      const tagConnections = validated.tags
        ? await Promise.all(
            validated.tags.map(async (tagName) => {
              // Find or create tag
              let tag = await db.tag.findFirst({
                where: { name: tagName },
              });

              if (!tag) {
                tag = await db.tag.create({
                  data: { name: tagName },
                });
              }

              return { id: tag.id };
            })
          )
        : [];

      draft = await db.promptDraft.create({
        data: {
          userId: user.id,
          promptId: validated.promptId,
          title: validated.title,
          description: validated.description,
          content: validated.content,
          folderId: validated.folderId,
          tags: {
            connect: tagConnections,
          },
        },
      });
    }

    logger.info("Draft saved", {
      draftId: draft.id,
      userId: user.id,
      promptId: validated.promptId,
    });

    return { success: true, draft };
  } catch (error) {
    logger.error("Failed to save draft", { error });

    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }

    return { success: false, error: "Failed to save draft" };
  }
}

/**
 * Get all drafts for the current user
 */
export async function getUserDrafts() {
  try {
    const user = await requireAuth();

    const drafts = await db.promptDraft.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });

    logger.info("Retrieved user drafts", {
      userId: user.id,
      count: drafts.length,
    });

    return { success: true, drafts };
  } catch (error) {
    logger.error("Failed to get user drafts", { error });
    return { success: false, error: "Failed to retrieve drafts" };
  }
}

/**
 * Get a specific draft
 */
export async function getDraft(draftId: string) {
  try {
    const user = await requireAuth();

    const draft = await db.promptDraft.findFirst({
      where: {
        id: draftId,
        userId: user.id,
      },
    });

    if (!draft) {
      return { success: false, error: "Draft not found" };
    }

    return { success: true, draft };
  } catch (error) {
    logger.error("Failed to get draft", { error, draftId });
    return { success: false, error: "Failed to retrieve draft" };
  }
}

/**
 * Get draft for a specific prompt (if editing)
 */
export async function getDraftForPrompt(promptId: string) {
  try {
    const user = await requireAuth();

    const draft = await db.promptDraft.findFirst({
      where: {
        promptId,
        userId: user.id,
      },
    });

    return { success: true, draft };
  } catch (error) {
    logger.error("Failed to get draft for prompt", { error, promptId });
    return { success: false, error: "Failed to retrieve draft" };
  }
}

/**
 * Delete a draft
 */
export async function deleteDraft(draftId: string) {
  try {
    const user = await requireAuth();

    // Verify ownership
    const draft = await db.promptDraft.findFirst({
      where: {
        id: draftId,
        userId: user.id,
      },
    });

    if (!draft) {
      return { success: false, error: "Draft not found or unauthorized" };
    }

    await db.promptDraft.delete({
      where: { id: draftId },
    });

    logger.info("Draft deleted", {
      draftId,
      userId: user.id,
    });

    return { success: true };
  } catch (error) {
    logger.error("Failed to delete draft", { error, draftId });
    return { success: false, error: "Failed to delete draft" };
  }
}

/**
 * Delete old drafts (cleanup utility)
 */
export async function deleteOldDrafts(daysOld = 30) {
  try {
    const user = await requireAuth();

    // Only admins can run this
    if (user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await db.promptDraft.deleteMany({
      where: {
        updatedAt: {
          lt: cutoffDate,
        },
      },
    });

    logger.info("Old drafts deleted", {
      count: result.count,
      daysOld,
      adminId: user.id,
    });

    return { success: true, count: result.count };
  } catch (error) {
    logger.error("Failed to delete old drafts", { error });
    return { success: false, error: "Failed to delete old drafts" };
  }
}

/**
 * Get draft statistics
 */
export async function getDraftStats() {
  try {
    const user = await requireAuth();

    const [total, withPromptId] = await Promise.all([
      db.promptDraft.count({
        where: { userId: user.id },
      }),
      db.promptDraft.count({
        where: {
          userId: user.id,
          promptId: { not: null },
        },
      }),
    ]);

    return {
      success: true,
      stats: {
        total,
        editing: withPromptId,
        new: total - withPromptId,
      },
    };
  } catch (error) {
    logger.error("Failed to get draft stats", { error });
    return {
      success: false,
      error: "Failed to retrieve stats",
      stats: { total: 0, editing: 0, new: 0 },
    };
  }
}
