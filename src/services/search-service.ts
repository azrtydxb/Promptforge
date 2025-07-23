import { db } from '@/lib/db';
import { generateEmbedding } from './embedding-service';
import { logger } from '@/lib/logger';
import { Prisma } from '@/generated/prisma';
import { isSemanticSearchEnabled } from '@/app/actions/semantic-search.actions';

export interface SearchOptions {
  query: string;
  userId?: string;
  limit?: number;
  threshold?: number; // Similarity threshold (0-1)
  includeTemplates?: boolean;
  filters?: {
    tags?: string[];
    folderId?: string | null;
    hasEnhancement?: boolean;
    dateRange?: {
      start?: Date;
      end?: Date;
    };
  };
}

export interface SearchResult {
  prompts: Array<{
    id: string;
    title: string;
    description: string | null;
    content: string | null;
    similarity: number;
    tags: Array<{ id: string; name: string }>;
    _count: {
      likes: number;
      favorites: number;
    };
  }>;
  templates?: Array<{
    id: string;
    name: string;
    description: string | null;
    category: string;
    similarity: number;
    usageCount: number;
    rating: number | null;
  }>;
}

/**
 * Perform semantic search on prompts and optionally templates
 */
export async function semanticSearch(options: SearchOptions): Promise<SearchResult> {
  const {
    query,
    userId,
    limit = 20,
    threshold = 0.5,
    includeTemplates = false,
    filters = {}
  } = options;

  try {
    // Check if semantic search is enabled
    const semanticSearchEnabled = await isSemanticSearchEnabled();
    
    if (!semanticSearchEnabled) {
      logger.info('Semantic search is disabled, returning empty results');
      return {
        prompts: [],
        templates: includeTemplates ? [] : undefined
      };
    }
    
    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);
    
    // Build base where clause for prompts (unused but kept for reference)
    // const promptWhere: Prisma.PromptWhereInput = {
    //   ...(userId ? { userId } : {}),
    //   embedding: { not: null },
    //   ...(filters.tags?.length ? {
    //     tags: {
    //       some: {
    //         name: { in: filters.tags }
    //       }
    //     }
    //   } : {}),
    //   ...(filters.folderId !== undefined ? { folderId: filters.folderId } : {}),
    //   ...(filters.hasEnhancement ? { enhancedContent: { not: null } } : {}),
    //   ...(filters.dateRange ? {
    //     createdAt: {
    //       ...(filters.dateRange.start ? { gte: filters.dateRange.start } : {}),
    //       ...(filters.dateRange.end ? { lte: filters.dateRange.end } : {})
    //     }
    //   } : {})
    // };

    // Convert embedding array to proper vector format for pgvector
    const embeddingString = `[${queryEmbedding.join(',')}]`;
    
    // Use raw SQL for vector similarity search with pgvector
    const promptResults = await db.$queryRaw<Array<{
      id: string;
      title: string;
      description: string | null;
      content: string | null;
      createdAt: Date;
      updatedAt: Date;
      similarity: number;
      likeCount: number;
      favoriteCount: number;
      tags: Array<{ id: string; name: string }> | null;
    }>>`
      SELECT 
        p.id,
        p.title,
        p.description,
        p.content,
        p."createdAt",
        p."updatedAt",
        1 - (CAST(p.embedding AS vector) <=> CAST(${embeddingString} AS vector)) as similarity,
        (
          SELECT COUNT(*)::int FROM "PromptLike" pl WHERE pl."promptId" = p.id
        ) as "likeCount",
        (
          SELECT COUNT(*)::int FROM "PromptFavorite" pf WHERE pf."promptId" = p.id
        ) as "favoriteCount",
        (
          SELECT json_agg(json_build_object('id', t.id, 'name', t.name))
          FROM "_PromptToTag" pt
          JOIN "Tag" t ON t.id = pt."B"
          WHERE pt."A" = p.id
        ) as tags
      FROM "Prompt" p
      WHERE 
        p.embedding IS NOT NULL
        AND p.embedding != ''
        ${userId ? Prisma.sql`AND p."userId" = ${userId}` : Prisma.empty}
        ${filters.folderId !== undefined ? Prisma.sql`AND p."folderId" ${filters.folderId === null ? Prisma.sql`IS NULL` : Prisma.sql`= ${filters.folderId}`}` : Prisma.empty}
        ${filters.hasEnhancement ? Prisma.sql`AND p."enhancedContent" IS NOT NULL` : Prisma.empty}
        ${filters.dateRange?.start ? Prisma.sql`AND p."createdAt" >= ${filters.dateRange.start}` : Prisma.empty}
        ${filters.dateRange?.end ? Prisma.sql`AND p."createdAt" <= ${filters.dateRange.end}` : Prisma.empty}
      HAVING 1 - (CAST(p.embedding AS vector) <=> CAST(${embeddingString} AS vector)) >= ${threshold}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;

    // Process prompt results
    const prompts = promptResults.map(result => ({
      id: result.id,
      title: result.title,
      description: result.description,
      content: result.content,
      similarity: result.similarity,
      tags: result.tags || [],
      _count: {
        likes: result.likeCount,
        favorites: result.favoriteCount
      }
    }));

    // Search templates if requested
    let templates: SearchResult['templates'] = undefined;
    if (includeTemplates) {
      const templateResults = await db.$queryRaw<Array<{
        id: string;
        name: string;
        description: string | null;
        category: string;
        usageCount: number;
        rating: number | null;
        similarity: number;
      }>>`
        SELECT 
          t.id,
          t.name,
          t.description,
          t.category,
          t."usageCount",
          t.rating,
          1 - (CAST(t.embedding AS vector) <=> CAST(${embeddingString} AS vector)) as similarity
        FROM "PromptTemplate" t
        WHERE 
          t.embedding IS NOT NULL
          AND t.embedding != ''
          AND t."isPublic" = true
        HAVING 1 - (CAST(t.embedding AS vector) <=> CAST(${embeddingString} AS vector)) >= ${threshold}
        ORDER BY similarity DESC
        LIMIT ${limit}
      `;

      templates = templateResults.map(result => ({
        id: result.id,
        name: result.name,
        description: result.description,
        category: result.category,
        similarity: result.similarity,
        usageCount: result.usageCount,
        rating: result.rating
      }));
    }

    // Log search
    logger.info('Semantic search completed', {
      query: query.substring(0, 50),
      promptCount: prompts.length,
      templateCount: templates?.length || 0
    });

    return { prompts, templates };
  } catch (error) {
    logger.error('Error performing semantic search', { error, query });
    throw error;
  }
}

/**
 * Find similar prompts to a given prompt
 */
export async function findSimilarPrompts(
  promptId: string,
  userId?: string,
  limit = 10
): Promise<Array<{
  id: string;
  title: string;
  description: string | null;
  similarity: number;
  tags: Array<{ id: string; name: string }>;
}>> {
  try {
    // Get the source prompt with embedding
    const sourcePrompt = await db.prompt.findUnique({
      where: { id: promptId },
      select: { embedding: true }
    });

    if (!sourcePrompt?.embedding) {
      return [];
    }

    // Find similar prompts using pgvector
    const results = await db.$queryRaw<Array<{
      id: string;
      title: string;
      description: string | null;
      similarity: number;
      tags: Array<{ id: string; name: string }> | null;
    }>>`
      SELECT 
        p.id,
        p.title,
        p.description,
        1 - (CAST(p.embedding AS vector) <=> CAST(${sourcePrompt.embedding} AS vector)) as similarity,
        (
          SELECT json_agg(json_build_object('id', t.id, 'name', t.name))
          FROM "_PromptToTag" pt
          JOIN "Tag" t ON t.id = pt."B"
          WHERE pt."A" = p.id
        ) as tags
      FROM "Prompt" p
      WHERE 
        p.embedding IS NOT NULL
        AND p.embedding != ''
        AND p.id != ${promptId}
        ${userId ? Prisma.sql`AND p."userId" = ${userId}` : Prisma.empty}
      ORDER BY CAST(p.embedding AS vector) <=> CAST(${sourcePrompt.embedding} AS vector)
      LIMIT ${limit}
    `;

    return results.map(result => ({
      id: result.id,
      title: result.title,
      description: result.description,
      similarity: result.similarity,
      tags: result.tags || []
    }));
  } catch (error) {
    logger.error('Error finding similar prompts', { error, promptId });
    throw error;
  }
}

/**
 * Hybrid search combining keyword and semantic search
 */
export async function hybridSearch(
  options: SearchOptions & { keywordWeight?: number }
): Promise<SearchResult> {
  const { query, keywordWeight = 0.3 } = options;
  
  try {
    // Perform semantic search
    const semanticResults = await semanticSearch(options);
    
    // Perform keyword search
    const keywordResults = await keywordSearch({
      query,
      userId: options.userId,
      limit: options.limit,
      filters: options.filters
    });
    
    // Combine and re-rank results
    const combinedPrompts = combineSearchResults(
      semanticResults.prompts,
      keywordResults.prompts,
      keywordWeight
    );

    return {
      prompts: combinedPrompts.slice(0, options.limit || 20),
      templates: semanticResults.templates
    };
  } catch (error) {
    logger.error('Error performing hybrid search', { error, query });
    throw error;
  }
}

/**
 * Traditional keyword search
 */
async function keywordSearch(options: Omit<SearchOptions, 'threshold' | 'includeTemplates'>) {
  const { query, userId, limit = 20, filters = {} } = options;
  
  const prompts = await db.prompt.findMany({
    where: {
      ...(userId ? { userId } : {}),
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } }
      ],
      ...(filters.tags?.length ? {
        tags: {
          some: {
            name: { in: filters.tags }
          }
        }
      } : {}),
      ...(filters.folderId !== undefined ? { folderId: filters.folderId } : {}),
      ...(filters.hasEnhancement ? { enhancedContent: { not: null } } : {}),
      ...(filters.dateRange ? {
        createdAt: {
          ...(filters.dateRange.start ? { gte: filters.dateRange.start } : {}),
          ...(filters.dateRange.end ? { lte: filters.dateRange.end } : {})
        }
      } : {})
    },
    include: {
      tags: true,
      _count: {
        select: {
          likes: true,
          favorites: true
        }
      }
    },
    take: limit
  });

  return {
    prompts: prompts.map(prompt => ({
      ...prompt,
      similarity: calculateKeywordRelevance(query, prompt)
    }))
  };
}

/**
 * Calculate keyword relevance score
 */
function calculateKeywordRelevance(query: string, prompt: {
  title: string;
  description?: string | null;
  content?: string | null;
}): number {
  const queryLower = query.toLowerCase();
  let score = 0;
  
  if (prompt.title.toLowerCase().includes(queryLower)) score += 0.5;
  if (prompt.description?.toLowerCase().includes(queryLower)) score += 0.3;
  if (prompt.content?.toLowerCase().includes(queryLower)) score += 0.2;
  
  return Math.min(score, 1);
}

/**
 * Combine semantic and keyword search results
 */
function combineSearchResults(
  semanticResults: Array<{ id: string; [key: string]: unknown }>,
  keywordResults: Array<{ id: string; similarity: number; [key: string]: unknown }>,
  keywordWeight: number
): Array<{ id: string; [key: string]: unknown }> {
  const semanticWeight = 1 - keywordWeight;
  const combined = new Map<string, { combinedScore: number; [key: string]: unknown }>();
  
  // Add semantic results
  semanticResults.forEach(result => {
    combined.set(result.id, {
      ...result,
      combinedScore: result.similarity * semanticWeight
    });
  });
  
  // Add/update with keyword results
  keywordResults.forEach(result => {
    const existing = combined.get(result.id);
    if (existing) {
      existing.combinedScore += result.similarity * keywordWeight;
    } else {
      combined.set(result.id, {
        ...result,
        combinedScore: result.similarity * keywordWeight
      });
    }
  });
  
  // Sort by combined score
  return Array.from(combined.values())
    .sort((a, b) => b.combinedScore - a.combinedScore)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ combinedScore: _combinedScore, ...rest }) => rest);
}