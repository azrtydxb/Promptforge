"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { createPrompt } from "./prompt.actions";

export async function getPromptTemplates(options?: {
  category?: string;
  isPublic?: boolean;
  authorId?: string;
}) {
  try {
    const templates = await db.promptTemplate.findMany({
      where: {
        ...(options?.category && { category: options.category }),
        ...(options?.isPublic !== undefined && { isPublic: options.isPublic }),
        ...(options?.authorId && { authorId: options.authorId }),
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            image: true,
          },
        },
      },
      orderBy: [
        { rating: "desc" },
        { usageCount: "desc" },
        { createdAt: "desc" },
      ],
    });

    return templates;
  } catch (error) {
    logger.error("Error fetching templates", error);
    throw error;
  }
}

export async function getTemplateById(templateId: string) {
  try {
    const template = await db.promptTemplate.findUnique({
      where: { id: templateId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            image: true,
          },
        },
      },
    });

    return template;
  } catch (error) {
    logger.error("Error fetching template", error);
    throw error;
  }
}

export async function createTemplate(data: {
  name: string;
  description?: string;
  category: string;
  content: string;
  variables: Record<string, { description: string; example?: string }>;
  example?: string;
  icon?: string;
  isPublic?: boolean;
}) {
  const user = await requireAuth();

  try {
    const template = await db.promptTemplate.create({
      data: {
        ...data,
        authorId: user.id,
      },
    });

    logger.info("Template created", { templateId: template.id, userId: user.id });
    revalidatePath("/templates");

    return template;
  } catch (error) {
    logger.error("Error creating template", error);
    throw error;
  }
}

export async function updateTemplate(
  templateId: string,
  data: {
    name?: string;
    description?: string;
    category?: string;
    content?: string;
    variables?: Record<string, { description: string; example?: string }>;
    example?: string;
    icon?: string;
    isPublic?: boolean;
  }
) {
  const user = await requireAuth();

  try {
    // Check ownership
    const template = await db.promptTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template || template.authorId !== user.id) {
      throw new Error("Template not found or unauthorized");
    }

    const updated = await db.promptTemplate.update({
      where: { id: templateId },
      data,
    });

    logger.info("Template updated", { templateId, userId: user.id });
    revalidatePath("/templates");
    revalidatePath(`/templates/${templateId}`);

    return updated;
  } catch (error) {
    logger.error("Error updating template", error);
    throw error;
  }
}

export async function deleteTemplate(templateId: string) {
  const user = await requireAuth();

  try {
    // Check ownership
    const template = await db.promptTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template || template.authorId !== user.id) {
      throw new Error("Template not found or unauthorized");
    }

    await db.promptTemplate.delete({
      where: { id: templateId },
    });

    logger.info("Template deleted", { templateId, userId: user.id });
    revalidatePath("/templates");

    return { success: true };
  } catch (error) {
    logger.error("Error deleting template", error);
    throw error;
  }
}

export async function createPromptFromTemplate(templateId: string) {
  const user = await requireAuth();

  try {
    const template = await db.promptTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error("Template not found");
    }

    // Increment usage count
    await db.promptTemplate.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } },
    });

    // Create a new prompt from the template
    const prompt = await createPrompt({
      title: `From ${template.name}`,
      content: template.content,
      description: `Created from template: ${template.name}`,
      tags: [template.category, "from-template"],
    });

    // Link the prompt to the template
    await db.prompt.update({
      where: { id: prompt.id },
      data: { templateId },
    });

    logger.info("Template used", { templateId, promptId: prompt.id, userId: user.id });

    return prompt.id;
  } catch (error) {
    logger.error("Error using template", error);
    throw error;
  }
}

export async function rateTemplate(templateId: string, rating: number) {
  const user = await requireAuth();

  if (rating < 1 || rating > 5) {
    throw new Error("Invalid rating value");
  }

  try {
    // For now, we'll just update the rating directly
    // In a production app, you'd want to track individual ratings and calculate an average
    const template = await db.promptTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error("Template not found");
    }

    // Simple average calculation (this is a simplified version)
    const newRating = template.rating
      ? (template.rating + rating) / 2
      : rating;

    await db.promptTemplate.update({
      where: { id: templateId },
      data: { rating: newRating },
    });

    logger.info("Template rated", { templateId, rating, userId: user.id });
    revalidatePath("/templates");

    return { success: true };
  } catch (error) {
    logger.error("Error rating template", error);
    throw error;
  }
}