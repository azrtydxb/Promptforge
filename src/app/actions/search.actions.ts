"use server";

import { requireAuth } from "@/lib/auth";
import { semanticSearch, findSimilarPrompts, hybridSearch } from "@/services/search-service";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { z } from "zod";
import { scheduleUserEmbeddingUpdate, scheduleBatchEmbeddingUpdate } from "@/lib/queues/embedding-queue";

// Validation schemas
const searchSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().min(1).max(50).optional(),
  threshold: z.number().min(0).max(1).optional(),
  includeTemplates: z.boolean().optional(),
  filters: z.object({
    tags: z.array(z.string()).optional(),
    folderId: z.string().nullable().optional(),
    hasEnhancement: z.boolean().optional(),
    dateRange: z.object({
      start: z.date().optional(),
      end: z.date().optional()
    }).optional()
  }).optional()
});

const hybridSearchSchema = searchSchema.extend({
  keywordWeight: z.number().min(0).max(1).optional()
});

/**
 * Perform semantic search on user's prompts
 */
export async function searchPrompts(input: z.infer<typeof searchSchema>) {
  try {
    const user = await requireAuth();
    const validated = searchSchema.parse(input);
    
    logger.info('Searching prompts', {
      userId: user.id,
      query: validated.query.substring(0, 50)
    });

    const results = await semanticSearch({
      ...validated,
      userId: user.id
    });

    // Log search in AI usage
    await db.aIUsageLog.create({
      data: {
        userId: user.id,
        operation: 'search',
        provider: 'openai',
        model: 'text-embedding-3-small',
        tokensUsed: validated.query.split(' ').length,
        cost: 0.00002, // Cost per embedding
        duration: 0, // TODO: Track actual duration
        success: true
      }
    });

    return results;
  } catch (error) {
    logger.error('Error searching prompts', { error });
    throw new Error('Failed to search prompts');
  }
}

/**
 * Perform hybrid search (semantic + keyword)
 */
export async function searchPromptsHybrid(input: z.infer<typeof hybridSearchSchema>) {
  try {
    const user = await requireAuth();
    const validated = hybridSearchSchema.parse(input);
    
    logger.info('Hybrid searching prompts', {
      userId: user.id,
      query: validated.query.substring(0, 50),
      keywordWeight: validated.keywordWeight
    });

    const results = await hybridSearch({
      ...validated,
      userId: user.id
    });

    // Log search in AI usage
    await db.aIUsageLog.create({
      data: {
        userId: user.id,
        operation: 'search',
        provider: 'openai',
        model: 'text-embedding-3-small',
        tokensUsed: validated.query.split(' ').length,
        cost: 0.00002,
        duration: 0, // TODO: Track actual duration
        success: true
      }
    });

    return results;
  } catch (error) {
    logger.error('Error in hybrid search', { error });
    throw new Error('Failed to perform hybrid search');
  }
}

/**
 * Find prompts similar to a given prompt
 */
export async function getSimilarPrompts(promptId: string, limit = 5) {
  try {
    const user = await requireAuth();
    
    logger.info('Finding similar prompts', {
      userId: user.id,
      promptId,
      limit
    });

    const results = await findSimilarPrompts(promptId, user.id, limit);
    
    return results;
  } catch (error) {
    logger.error('Error finding similar prompts', { error, promptId });
    throw new Error('Failed to find similar prompts');
  }
}

/**
 * Trigger embedding update for user's prompts
 */
export async function triggerEmbeddingUpdate() {
  try {
    const user = await requireAuth();
    
    logger.info('Triggering embedding update', { userId: user.id });
    
    // Schedule the job in Redis queue
    await scheduleUserEmbeddingUpdate(user.id);
    
    return {
      success: true,
      message: 'Embedding update scheduled. Your prompts will be updated shortly.'
    };
  } catch (error) {
    logger.error('Error triggering embedding update', { error });
    throw new Error('Failed to schedule embedding update');
  }
}

/**
 * Trigger batch embedding update for all outdated embeddings
 */
export async function triggerBatchEmbeddingUpdate() {
  try {
    await requireAuth(); // Only authenticated users can trigger this
    
    logger.info('Triggering batch embedding update');
    
    // Schedule the batch job
    await scheduleBatchEmbeddingUpdate();
    
    return {
      success: true,
      message: 'Batch embedding update scheduled.'
    };
  } catch (error) {
    logger.error('Error triggering batch embedding update', { error });
    throw new Error('Failed to schedule batch embedding update');
  }
}

/**
 * Search across all public content (marketplace)
 */
export async function searchMarketplace(input: z.infer<typeof searchSchema>) {
  try {
    const validated = searchSchema.parse(input);
    
    logger.info('Searching marketplace', {
      query: validated.query.substring(0, 50)
    });

    // For marketplace, we search without userId filter
    const results = await semanticSearch({
      ...validated,
      includeTemplates: true
    });

    return results;
  } catch (error) {
    logger.error('Error searching marketplace', { error });
    throw new Error('Failed to search marketplace');
  }
}