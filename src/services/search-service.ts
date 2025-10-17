import { db } from '@/lib/db';

export interface SearchOptions {
  query: string;
  userId?: string;
  limit?: number;
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
    usageCount: number;
    rating: number | null;
  }>;
}

/**
 * Traditional keyword search
 */
export async function keywordSearch(options: Omit<SearchOptions, 'includeTemplates'>) {
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
    }))
  };
}
