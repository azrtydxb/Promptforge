"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { aiService } from "@/services/ai-service";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export async function enhancePrompt(promptId: string) {
  const user = await requireAuth();

  try {
    // Get the prompt
    const prompt = await db.prompt.findUnique({
      where: {
        id: promptId,
        userId: user.id,
      },
    });

    if (!prompt || !prompt.content) {
      throw new Error("Prompt not found or has no content");
    }

    // Check if already enhanced
    if (prompt.enhancedContent) {
      return {
        success: true,
        alreadyEnhanced: true,
        enhancedContent: prompt.enhancedContent,
        suggestions: prompt.enhancementSuggestions,
      };
    }

    // Enhance the prompt
    const result = await aiService.enhancePrompt(
      prompt.content,
      user.id,
      promptId
    );

    // Save the enhancement
    await db.prompt.update({
      where: { id: promptId },
      data: {
        enhancedContent: result.enhancedContent,
        enhancementSuggestions: result.suggestions,
      },
    });

    logger.info("Prompt enhanced", { promptId, userId: user.id });

    revalidatePath(`/prompts/${promptId}`);
    return {
      success: true,
      ...result,
    };
  } catch (error) {
    logger.error("Error enhancing prompt", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to enhance prompt",
    };
  }
}

export async function generateAutoTags(promptId: string) {
  const user = await requireAuth();

  try {
    // Get the prompt
    const prompt = await db.prompt.findUnique({
      where: {
        id: promptId,
        userId: user.id,
      },
      include: {
        tags: true,
      },
    });

    if (!prompt || !prompt.content) {
      throw new Error("Prompt not found or has no content");
    }

    // Generate tags
    const result = await aiService.generateAutoTags(
      prompt.content,
      user.id,
      promptId
    );

    // Save auto-generated tags
    await db.prompt.update({
      where: { id: promptId },
      data: {
        autoTags: result.tags,
      },
    });

    logger.info("Auto-tags generated", { 
      promptId, 
      userId: user.id, 
      tagsCount: result.tags.length 
    });

    revalidatePath(`/prompts/${promptId}`);
    return {
      success: true,
      ...result,
    };
  } catch (error) {
    logger.error("Error generating auto-tags", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate tags",
    };
  }
}

export async function applyAutoTags(promptId: string, tags: string[]) {
  const user = await requireAuth();

  try {
    // Get or create tags
    const tagRecords = await Promise.all(
      tags.map(async (tagName) => {
        let tag = await db.tag.findFirst({
          where: { name: tagName },
        });

        if (!tag) {
          tag = await db.tag.create({
            data: { name: tagName },
          });
        }

        return tag;
      })
    );

    // Connect tags to prompt
    await db.prompt.update({
      where: {
        id: promptId,
        userId: user.id,
      },
      data: {
        tags: {
          connect: tagRecords.map((tag) => ({ id: tag.id })),
        },
      },
    });

    logger.info("Auto-tags applied", { 
      promptId, 
      userId: user.id, 
      tags 
    });

    revalidatePath(`/prompts/${promptId}`);
    return { success: true };
  } catch (error) {
    logger.error("Error applying auto-tags", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to apply tags",
    };
  }
}

export async function findSimilarPrompts(promptId: string) {
  const user = await requireAuth();

  try {
    const prompt = await db.prompt.findUnique({
      where: {
        id: promptId,
        userId: user.id,
      },
    });

    if (!prompt || !prompt.content) {
      throw new Error("Prompt not found or has no content");
    }

    // Generate embedding if not exists
    let embedding = prompt.embedding as number[] | null;
    if (!embedding) {
      embedding = await aiService.generateEmbedding(prompt.content, user.id);
      
      // Save embedding
      await db.prompt.update({
        where: { id: promptId },
        data: { embedding },
      });
    }

    // Find similar prompts
    const similarIds = await aiService.findSimilarPrompts(embedding, 5, promptId);

    // Fetch prompt details
    const similarPrompts = await db.prompt.findMany({
      where: {
        id: { in: similarIds.map((s) => s.id) },
        userId: user.id,
      },
      select: {
        id: true,
        title: true,
        description: true,
        tags: true,
      },
    });

    // Sort by similarity score
    const results = similarPrompts.map((prompt) => {
      const similarity = similarIds.find((s) => s.id === prompt.id)?.similarity || 0;
      return { ...prompt, similarity };
    }).sort((a, b) => b.similarity - a.similarity);

    logger.info("Similar prompts found", { 
      promptId, 
      userId: user.id, 
      count: results.length 
    });

    return {
      success: true,
      similarPrompts: results,
    };
  } catch (error) {
    logger.error("Error finding similar prompts", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to find similar prompts",
    };
  }
}

export async function getAIUsageStats(days: number = 30) {
  const user = await requireAuth();

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const usage = await db.aIUsageLog.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate stats
    const stats = {
      totalOperations: usage.length,
      totalTokens: usage.reduce((sum, log) => sum + log.tokensUsed, 0),
      totalCost: usage.reduce((sum, log) => sum + (log.cost || 0), 0),
      byOperation: {} as Record<string, number>,
      byProvider: {} as Record<string, number>,
      successRate: usage.filter((log) => log.success).length / usage.length,
    };

    // Group by operation and provider
    usage.forEach((log) => {
      stats.byOperation[log.operation] = (stats.byOperation[log.operation] || 0) + 1;
      stats.byProvider[log.provider] = (stats.byProvider[log.provider] || 0) + 1;
    });

    return {
      success: true,
      stats,
      recentUsage: usage.slice(0, 10),
    };
  } catch (error) {
    logger.error("Error fetching AI usage stats", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch usage stats",
    };
  }
}