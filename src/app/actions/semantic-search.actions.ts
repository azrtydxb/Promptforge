"use server";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// Public function to check if semantic search is enabled
// No auth required as this is a read-only setting check
export async function isSemanticSearchEnabled(): Promise<boolean> {
  try {
    const setting = await db.systemSettings.findUnique({
      where: { key: 'semantic_search_enabled' }
    });
    
    return setting?.value === 'true';
  } catch (error) {
    logger.error("Error checking semantic search setting", { error });
    // Default to false if there's an error
    return false;
  }
}

// Helper to check if embeddings are available for semantic search
export async function canUseSemanticSearch(): Promise<{
  enabled: boolean;
  hasEmbeddings: boolean;
  message?: string;
}> {
  try {
    // Check if semantic search is enabled
    const enabled = await isSemanticSearchEnabled();
    
    if (!enabled) {
      return {
        enabled: false,
        hasEmbeddings: false,
        message: "Semantic search is disabled by administrator"
      };
    }
    
    // Check if we have any embeddings
    const [promptsWithEmbeddings, templatesWithEmbeddings] = await Promise.all([
      db.prompt.count({
        where: {
          embeddingOutdated: false
        }
      }),
      db.promptTemplate.count({
        where: {
          embeddingOutdated: false
        }
      })
    ]);
    
    const hasEmbeddings = (promptsWithEmbeddings + templatesWithEmbeddings) > 0;
    
    return {
      enabled,
      hasEmbeddings,
      message: hasEmbeddings ? undefined : "No embeddings available for semantic search"
    };
  } catch (error) {
    logger.error("Error checking semantic search availability", { error });
    return {
      enabled: false,
      hasEmbeddings: false,
      message: "Error checking semantic search availability"
    };
  }
}