"use server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { z } from "zod";

// Validation schemas
const keywordSearchSchema = z.object({
  query: z.string().max(500),
  limit: z.number().min(1).max(50).optional().default(20),
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
 * Perform standard keyword search on prompts without using embeddings
 */
export async function searchPromptsKeyword(input: z.infer<typeof keywordSearchSchema>) {
  try {
    const user = await requireAuth();
    const validated = keywordSearchSchema.parse(input);
    
    logger.info('Keyword searching prompts', {
      userId: user.id,
      query: validated.query.substring(0, 50)
    });

    // Build where clause
    const where: any = {
      userId: user.id,
      deletedAt: null,
    };

    // Add search conditions if query is provided
    if (validated.query && validated.query.trim()) {
      where.OR = [
        { title: { contains: validated.query, mode: 'insensitive' } },
        { description: { contains: validated.query, mode: 'insensitive' } },
        { content: { contains: validated.query, mode: 'insensitive' } },
      ];
    }

    // Add filter conditions
    if (validated.filters?.tags?.length) {
      where.tags = {
        some: {
          tag: {
            id: { in: validated.filters.tags }
          }
        }
      };
    }

    if (validated.filters?.folderId !== undefined) {
      where.folderId = validated.filters.folderId;
    }

    if (validated.filters?.hasEnhancement) {
      where.enhancedVersionId = { not: null };
    }

    if (validated.filters?.dateRange) {
      const dateConditions: any = {};
      if (validated.filters.dateRange.start) {
        dateConditions.gte = validated.filters.dateRange.start;
      }
      if (validated.filters.dateRange.end) {
        dateConditions.lte = validated.filters.dateRange.end;
      }
      if (Object.keys(dateConditions).length > 0) {
        where.createdAt = dateConditions;
      }
    }

    // Perform the search
    const [prompts, total] = await Promise.all([
      db.prompt.findMany({
        where,
        include: {
          tags: {
            include: {
              tag: true
            }
          },
          folder: true,
          likes: {
            where: { userId: user.id }
          },
          versions: {
            select: { id: true }
          },
          enhancedVersion: {
            select: {
              id: true,
              content: true
            }
          }
        },
        orderBy: [
          { updatedAt: 'desc' },
          { createdAt: 'desc' }
        ],
        take: validated.limit,
      }),
      db.prompt.count({ where })
    ]);

    // Transform the results
    const transformedPrompts = prompts.map(prompt => ({
      id: prompt.id,
      title: prompt.title,
      description: prompt.description,
      content: prompt.content,
      tags: prompt.tags.map(pt => pt.tag),
      folder: prompt.folder,
      isLiked: prompt.likes.length > 0,
      isFavorite: prompt.isFavorite,
      likeCount: prompt.likeCount,
      hasVersions: prompt.versions.length > 1,
      hasEnhancement: !!prompt.enhancedVersion,
      enhancedContent: prompt.enhancedVersion?.content,
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt,
    }));

    return {
      prompts: transformedPrompts,
      total,
      query: validated.query,
      filters: validated.filters
    };
  } catch (error) {
    logger.error('Error in keyword search', { error });
    throw new Error('Failed to search prompts');
  }
}

/**
 * Search shared prompts using keyword search
 */
export async function searchSharedPromptsKeyword(input: z.infer<typeof keywordSearchSchema>) {
  try {
    const validated = keywordSearchSchema.parse(input);
    
    logger.info('Keyword searching shared prompts', {
      query: validated.query.substring(0, 50)
    });

    // Build where clause
    const where: any = {
      isPublished: true,
    };

    // Add search conditions if query is provided
    if (validated.query && validated.query.trim()) {
      where.OR = [
        { title: { contains: validated.query, mode: 'insensitive' } },
        { description: { contains: validated.query, mode: 'insensitive' } },
        { prompt: { content: { contains: validated.query, mode: 'insensitive' } } },
      ];
    }

    // Add filter conditions
    if (validated.filters?.tags?.length) {
      where.prompt = {
        ...where.prompt,
        tags: {
          some: {
            tag: {
              id: { in: validated.filters.tags }
            }
          }
        }
      };
    }

    // Perform the search
    const [sharedPrompts, total] = await Promise.all([
      db.sharedPrompt.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              profilePicture: true,
              avatarType: true,
            }
          },
          prompt: {
            include: {
              tags: {
                include: {
                  tag: true
                }
              }
            }
          }
        },
        orderBy: [
          { publishedAt: 'desc' }
        ],
        take: validated.limit,
      }),
      db.sharedPrompt.count({ where })
    ]);

    // Transform the results
    const transformedPrompts = sharedPrompts.map(sp => ({
      id: sp.id,
      promptId: sp.promptId,
      title: sp.title,
      description: sp.description,
      content: sp.prompt.content,
      publishedAt: sp.publishedAt,
      viewCount: sp.viewCount,
      likeCount: sp.likeCount,
      commentCount: sp.commentCount,
      copyCount: sp.copyCount,
      author: sp.author,
      prompt: {
        tags: sp.prompt.tags.map(pt => pt.tag)
      }
    }));

    return {
      prompts: transformedPrompts,
      total,
      query: validated.query,
      filters: validated.filters
    };
  } catch (error) {
    logger.error('Error in shared prompts keyword search', { error });
    throw new Error('Failed to search shared prompts');
  }
}

/**
 * Search templates using keyword search
 */
export async function searchTemplatesKeyword(input: z.infer<typeof keywordSearchSchema>) {
  try {
    const validated = keywordSearchSchema.parse(input);
    
    logger.info('Keyword searching templates', {
      query: validated.query.substring(0, 50)
    });

    // Build where clause
    const where: any = {
      isPublic: true,
    };

    // Add search conditions if query is provided
    if (validated.query && validated.query.trim()) {
      where.OR = [
        { name: { contains: validated.query, mode: 'insensitive' } },
        { description: { contains: validated.query, mode: 'insensitive' } },
        { content: { contains: validated.query, mode: 'insensitive' } },
        { category: { contains: validated.query, mode: 'insensitive' } },
      ];
    }

    // Perform the search
    const [templates, total] = await Promise.all([
      db.promptTemplate.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              profilePicture: true,
            }
          }
        },
        orderBy: [
          { usageCount: 'desc' },
          { createdAt: 'desc' }
        ],
        take: validated.limit,
      }),
      db.promptTemplate.count({ where })
    ]);

    return {
      templates,
      total,
      query: validated.query,
      filters: validated.filters
    };
  } catch (error) {
    logger.error('Error in templates keyword search', { error });
    throw new Error('Failed to search templates');
  }
}