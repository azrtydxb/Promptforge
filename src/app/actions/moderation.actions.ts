"use server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Validation schemas
const moderatePromptSchema = z.object({
  promptId: z.string(),
  status: z.enum(["APPROVED", "REJECTED", "FLAGGED"]),
  reason: z.string().optional(),
});

const createRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  pattern: z.string().min(1),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  action: z.enum(["FLAG", "BLOCK", "REJECT", "REQUIRE_REVIEW"]),
  isActive: z.boolean().default(true),
});

/**
 * Get all pending content for moderation
 */
export async function getPendingModeration() {
  try {
    const user = await requireAuth();

    // Only moderators and admins can access
    if (user.role !== "MODERATOR" && user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized: Moderator access required" };
    }

    const [prompts, flaggedPrompts, recentLogs] = await Promise.all([
      // Pending prompts
      db.sharedPrompt.findMany({
        where: { status: "PENDING" },
        include: {
          prompt: {
            select: {
              title: true,
              description: true,
            },
          },
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),

      // Flagged prompts
      db.sharedPrompt.findMany({
        where: { status: "FLAGGED" },
        include: {
          prompt: {
            select: {
              title: true,
              description: true,
            },
          },
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),

      // Recent moderation logs
      db.moderationLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    return {
      success: true,
      data: {
        pending: prompts,
        flagged: flaggedPrompts,
        recentLogs,
      },
    };
  } catch (_error) {
    logger.error("Failed to get pending moderation", { _error });
    return { success: false, error: "Failed to retrieve moderation queue" };
  }
}

/**
 * Moderate a shared prompt
 */
export async function moderatePrompt(input: z.infer<typeof moderatePromptSchema>) {
  try {
    const user = await requireAuth();
    const validated = moderatePromptSchema.parse(input);

    // Only moderators and admins can moderate
    if (user.role !== "MODERATOR" && user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized: Moderator access required" };
    }

    // Get the shared prompt
    const sharedPrompt = await db.sharedPrompt.findUnique({
      where: { id: validated.promptId },
    });

    if (!sharedPrompt) {
      return { success: false, error: "Prompt not found" };
    }

    // Update the status
    await db.sharedPrompt.update({
      where: { id: validated.promptId },
      data: {
        status: validated.status,
        moderatedBy: user.id,
        moderatedAt: new Date(),
        rejectionReason: validated.reason,
      },
    });

    // Log the moderation action
    await db.moderationLog.create({
      data: {
        contentType: "prompt",
        contentId: validated.promptId,
        action: validated.status === "APPROVED" ? "FLAG" : "REJECT",
        reason: validated.reason,
        automated: false,
        reviewedBy: user.id,
      },
    });

    logger.info("Prompt moderated", {
      promptId: validated.promptId,
      status: validated.status,
      moderatorId: user.id,
    });

    revalidatePath("/admin/moderation");
    revalidatePath(`/marketplace/${validated.promptId}`);
    return { success: true };
  } catch (_error) {
    logger.error("Failed to moderate prompt", { _error });

    if (_error instanceof z.ZodError) {
      return { success: false, error: _error.errors[0].message };
    }

    return { success: false, error: "Failed to moderate prompt" };
  }
}

/**
 * Get moderation rules
 */
export async function getModerationRules() {
  try {
    const user = await requireAuth();

    if (user.role !== "MODERATOR" && user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized: Moderator access required" };
    }

    const rules = await db.moderationRule.findMany({
      include: {
        _count: {
          select: { logs: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, rules };
  } catch (_error) {
    logger.error("Failed to get moderation rules", { _error });
    return { success: false, error: "Failed to retrieve moderation rules" };
  }
}

/**
 * Create a moderation rule
 */
export async function createModerationRule(input: z.infer<typeof createRuleSchema>) {
  try {
    const user = await requireAuth();
    const validated = createRuleSchema.parse(input);

    // Only admins can create rules
    if (user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized: Admin access required" };
    }

    const rule = await db.moderationRule.create({
      data: validated,
    });

    logger.info("Moderation rule created", {
      ruleId: rule.id,
      name: validated.name,
      adminId: user.id,
    });

    revalidatePath("/admin/moderation");
    return { success: true, rule };
  } catch (_error) {
    logger.error("Failed to create moderation rule", { _error });

    if (_error instanceof z.ZodError) {
      return { success: false, error: _error.errors[0].message };
    }

    return { success: false, error: "Failed to create moderation rule" };
  }
}

/**
 * Update a moderation rule
 */
export async function updateModerationRule(
  ruleId: string,
  data: Partial<z.infer<typeof createRuleSchema>>
) {
  try {
    const user = await requireAuth();

    // Only admins can update rules
    if (user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized: Admin access required" };
    }

    const rule = await db.moderationRule.update({
      where: { id: ruleId },
      data,
    });

    logger.info("Moderation rule updated", {
      ruleId,
      adminId: user.id,
    });

    revalidatePath("/admin/moderation");
    return { success: true, rule };
  } catch (_error) {
    logger.error("Failed to update moderation rule", { _error, ruleId });
    return { success: false, error: "Failed to update moderation rule" };
  }
}

/**
 * Delete a moderation rule
 */
export async function deleteModerationRule(ruleId: string) {
  try {
    const user = await requireAuth();

    // Only admins can delete rules
    if (user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized: Admin access required" };
    }

    await db.moderationRule.delete({
      where: { id: ruleId },
    });

    logger.info("Moderation rule deleted", {
      ruleId,
      adminId: user.id,
    });

    revalidatePath("/admin/moderation");
    return { success: true };
  } catch (_error) {
    logger.error("Failed to delete moderation rule", { _error, ruleId });
    return { success: false, error: "Failed to delete moderation rule" };
  }
}

/**
 * Get moderation statistics
 */
export async function getModerationStats() {
  try {
    const user = await requireAuth();

    if (user.role !== "MODERATOR" && user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized: Moderator access required" };
    }

    const [pending, flagged, approved, rejected, todayLogs] = await Promise.all([
      db.sharedPrompt.count({ where: { status: "PENDING" } }),
      db.sharedPrompt.count({ where: { status: "FLAGGED" } }),
      db.sharedPrompt.count({ where: { status: "APPROVED" } }),
      db.sharedPrompt.count({ where: { status: "REJECTED" } }),
      db.moderationLog.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    return {
      success: true,
      stats: {
        pending,
        flagged,
        approved,
        rejected,
        todayActions: todayLogs,
        total: pending + flagged + approved + rejected,
      },
    };
  } catch (_error) {
    logger.error("Failed to get moderation stats", { _error });
    return {
      success: false,
      error: "Failed to retrieve moderation statistics",
      stats: {
        pending: 0,
        flagged: 0,
        approved: 0,
        rejected: 0,
        todayActions: 0,
        total: 0,
      },
    };
  }
}

/**
 * Get moderation logs with filtering
 */
export async function getModerationLogs(limit = 100, contentType?: string) {
  try {
    const user = await requireAuth();

    if (user.role !== "MODERATOR" && user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized: Moderator access required" };
    }

    const logs = await db.moderationLog.findMany({
      where: contentType ? { contentType } : undefined,
      include: {
        rule: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return { success: true, logs };
  } catch (_error) {
    logger.error("Failed to get moderation logs", { _error });
    return { success: false, error: "Failed to retrieve moderation logs" };
  }
}
