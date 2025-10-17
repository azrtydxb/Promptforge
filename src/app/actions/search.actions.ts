"use server";

import { requireAuth } from "@/lib/auth";
import { keywordSearch } from "@/services/search-service";
import { logger } from "@/lib/logger";
import { z } from "zod";

// Validation schemas
const searchSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().min(1).max(50).optional(),
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

/**
 * Perform keyword search on user's prompts
 */
export async function searchPrompts(input: z.infer<typeof searchSchema>) {
  try {
    const user = await requireAuth();
    const validated = searchSchema.parse(input);

    logger.info('Searching prompts', {
      userId: user.id,
      query: validated.query.substring(0, 50)
    });

    const results = await keywordSearch({
      ...validated,
      userId: user.id
    });

    return results;
  } catch (_error) {
    logger.error('Error searching prompts', { _error });
    throw new Error('Failed to search prompts');
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
    const results = await keywordSearch({
      ...validated,
    });

    return results;
  } catch (_error) {
    logger.error('Error searching marketplace', { _error });
    throw new Error('Failed to search marketplace');
  }
}
