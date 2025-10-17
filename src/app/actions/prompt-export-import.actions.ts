"use server";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Export schema for a single prompt
const ExportedPromptSchema = z.object({
  title: z.string(),
  content: z.string().nullable(),
  description: z.string().nullable(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

// Export schema for multiple prompts
const ExportDataSchema = z.object({
  version: z.literal("1.0"),
  exportDate: z.string(),
  prompts: z.array(ExportedPromptSchema),
});

export type ExportedPrompt = z.infer<typeof ExportedPromptSchema>;
export type ExportData = z.infer<typeof ExportDataSchema>;

export async function exportPrompts(promptIds?: string[]): Promise<ExportData> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Build query based on whether specific prompts are requested
  const whereClause = promptIds?.length 
    ? { userId: user.id, id: { in: promptIds } }
    : { userId: user.id };

  const prompts = await db.prompt.findMany({
    where: whereClause,
    include: {
      tags: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Transform prompts to export format
  const exportedPrompts: ExportedPrompt[] = prompts.map((prompt) => ({
    title: prompt.title,
    content: prompt.content,
    description: prompt.description,
    tags: prompt.tags.map((tag) => tag.name),
    createdAt: prompt.createdAt.toISOString(),
    updatedAt: prompt.updatedAt.toISOString(),
  }));

  return {
    version: "1.0",
    exportDate: new Date().toISOString(),
    prompts: exportedPrompts,
  };
}

export async function importPrompts(data: unknown, folderId?: string): Promise<{
  imported: number;
  skipped: number;
  errors: string[];
}> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  try {
    // Validate the import data
    const validatedData = ExportDataSchema.parse(data);

    // Process each prompt
    for (const promptData of validatedData.prompts) {
      try {
        // Check if a prompt with the same title already exists
        const existingPrompt = await db.prompt.findFirst({
          where: {
            userId: user.id,
            title: promptData.title,
          },
        });

        if (existingPrompt) {
          skipped++;
          continue;
        }

        // Handle tags if present
        const tagConnections = [];
        if (promptData.tags && promptData.tags.length > 0) {
          for (const tagName of promptData.tags) {
            // Get or create tag
            let tag = await db.tag.findFirst({
              where: {
                name: tagName,
              },
            });

            if (!tag) {
              tag = await db.tag.create({
                data: {
                  name: tagName,
                },
              });
            }

            tagConnections.push({ id: tag.id });
          }
        }

        // Create the prompt with tag connections
        await db.prompt.create({
          data: {
            title: promptData.title,
            content: promptData.content,
            description: promptData.description,
            userId: user.id,
            folderId,
            tags: {
              connect: tagConnections,
            },
          },
        });

        imported++;
      } catch (_error) {
        errors.push(`Failed to import "${promptData.title}": ${_error instanceof Error ? "Failed" : 'Unknown error'}`);
      }
    }
  } catch (_error) {
    if (_error instanceof z.ZodError) {
      throw new Error("Invalid import file format");
    }
    throw _error;
  }

  return {
    imported,
    skipped,
    errors,
  };
}