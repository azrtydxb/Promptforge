"use server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { revalidatePath } from "next/cache";

// Validation schemas
const createCollectionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
});

const updateCollectionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isPublic: z.boolean().optional(),
});

/**
 * Get all collections for the current user
 */
export async function getUserCollections() {
  try {
    const user = await requireAuth();

    const collections = await db.collection.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { prompts: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    logger.info("Retrieved user collections", {
      userId: user.id,
      count: collections.length,
    });

    return { success: true, collections };
  } catch (error) {
    logger.error("Failed to get user collections", { error });
    return { success: false, error: "Failed to retrieve collections" };
  }
}

/**
 * Get a single collection by ID
 */
export async function getCollection(collectionId: string) {
  try {
    const user = await requireAuth();

    const collection = await db.collection.findFirst({
      where: {
        id: collectionId,
        OR: [{ userId: user.id }, { isPublic: true }],
      },
      include: {
        prompts: {
          include: {
            sharedPrompt: {
              include: {
                prompt: {
                  select: {
                    title: true,
                    description: true,
                  },
                },
                user: {
                  select: {
                    name: true,
                    username: true,
                  },
                },
                _count: {
                  select: {
                    ratings: true,
                    copies: true,
                  },
                },
              },
            },
          },
          orderBy: { addedAt: "desc" },
        },
        user: {
          select: {
            name: true,
            username: true,
          },
        },
        _count: {
          select: { prompts: true },
        },
      },
    });

    if (!collection) {
      return { success: false, error: "Collection not found" };
    }

    logger.info("Retrieved collection", {
      collectionId,
      userId: user.id,
    });

    return { success: true, collection };
  } catch (error) {
    logger.error("Failed to get collection", { error, collectionId });
    return { success: false, error: "Failed to retrieve collection" };
  }
}

/**
 * Get all public collections
 */
export async function getPublicCollections() {
  try {
    const collections = await db.collection.findMany({
      where: { isPublic: true },
      include: {
        user: {
          select: {
            name: true,
            username: true,
          },
        },
        _count: {
          select: { prompts: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    logger.info("Retrieved public collections", {
      count: collections.length,
    });

    return { success: true, collections };
  } catch (error) {
    logger.error("Failed to get public collections", { error });
    return { success: false, error: "Failed to retrieve public collections" };
  }
}

/**
 * Create a new collection
 */
export async function createCollection(
  input: z.infer<typeof createCollectionSchema>
) {
  try {
    const user = await requireAuth();
    const validated = createCollectionSchema.parse(input);

    const collection = await db.collection.create({
      data: {
        name: validated.name,
        description: validated.description,
        isPublic: validated.isPublic,
        userId: user.id,
      },
      include: {
        _count: {
          select: { prompts: true },
        },
      },
    });

    logger.info("Created collection", {
      collectionId: collection.id,
      userId: user.id,
      name: validated.name,
    });

    revalidatePath("/collections");
    return { success: true, collection };
  } catch (error) {
    logger.error("Failed to create collection", { error });

    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }

    return { success: false, error: "Failed to create collection" };
  }
}

/**
 * Update a collection
 */
export async function updateCollection(
  collectionId: string,
  input: z.infer<typeof updateCollectionSchema>
) {
  try {
    const user = await requireAuth();
    const validated = updateCollectionSchema.parse(input);

    // Verify ownership
    const existing = await db.collection.findFirst({
      where: {
        id: collectionId,
        userId: user.id,
      },
    });

    if (!existing) {
      return { success: false, error: "Collection not found or unauthorized" };
    }

    const collection = await db.collection.update({
      where: { id: collectionId },
      data: {
        ...(validated.name && { name: validated.name }),
        ...(validated.description !== undefined && {
          description: validated.description,
        }),
        ...(validated.isPublic !== undefined && {
          isPublic: validated.isPublic,
        }),
      },
      include: {
        _count: {
          select: { prompts: true },
        },
      },
    });

    logger.info("Updated collection", {
      collectionId,
      userId: user.id,
    });

    revalidatePath("/collections");
    revalidatePath(`/collections/${collectionId}`);
    return { success: true, collection };
  } catch (error) {
    logger.error("Failed to update collection", { error, collectionId });

    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }

    return { success: false, error: "Failed to update collection" };
  }
}

/**
 * Delete a collection
 */
export async function deleteCollection(collectionId: string) {
  try {
    const user = await requireAuth();

    // Verify ownership
    const existing = await db.collection.findFirst({
      where: {
        id: collectionId,
        userId: user.id,
      },
    });

    if (!existing) {
      return { success: false, error: "Collection not found or unauthorized" };
    }

    await db.collection.delete({
      where: { id: collectionId },
    });

    logger.info("Deleted collection", {
      collectionId,
      userId: user.id,
    });

    revalidatePath("/collections");
    return { success: true };
  } catch (error) {
    logger.error("Failed to delete collection", { error, collectionId });
    return { success: false, error: "Failed to delete collection" };
  }
}

/**
 * Add a prompt to a collection
 */
export async function addPromptToCollection(
  collectionId: string,
  sharedPromptId: string
) {
  try {
    const user = await requireAuth();

    // Verify collection ownership or public access
    const collection = await db.collection.findFirst({
      where: {
        id: collectionId,
        userId: user.id,
      },
    });

    if (!collection) {
      return { success: false, error: "Collection not found or unauthorized" };
    }

    // Check if prompt exists and is public
    const sharedPrompt = await db.sharedPrompt.findUnique({
      where: { id: sharedPromptId },
    });

    if (!sharedPrompt) {
      return { success: false, error: "Prompt not found" };
    }

    // Check if already added
    const existing = await db.collectionPrompt.findUnique({
      where: {
        collectionId_sharedPromptId: {
          collectionId,
          sharedPromptId,
        },
      },
    });

    if (existing) {
      return { success: false, error: "Prompt already in collection" };
    }

    // Add to collection
    await db.collectionPrompt.create({
      data: {
        collectionId,
        sharedPromptId,
      },
    });

    logger.info("Added prompt to collection", {
      collectionId,
      sharedPromptId,
      userId: user.id,
    });

    revalidatePath(`/collections/${collectionId}`);
    return { success: true };
  } catch (error) {
    logger.error("Failed to add prompt to collection", {
      error,
      collectionId,
      sharedPromptId,
    });
    return { success: false, error: "Failed to add prompt to collection" };
  }
}

/**
 * Remove a prompt from a collection
 */
export async function removePromptFromCollection(
  collectionId: string,
  sharedPromptId: string
) {
  try {
    const user = await requireAuth();

    // Verify collection ownership
    const collection = await db.collection.findFirst({
      where: {
        id: collectionId,
        userId: user.id,
      },
    });

    if (!collection) {
      return { success: false, error: "Collection not found or unauthorized" };
    }

    // Remove from collection
    await db.collectionPrompt.delete({
      where: {
        collectionId_sharedPromptId: {
          collectionId,
          sharedPromptId,
        },
      },
    });

    logger.info("Removed prompt from collection", {
      collectionId,
      sharedPromptId,
      userId: user.id,
    });

    revalidatePath(`/collections/${collectionId}`);
    return { success: true };
  } catch (error) {
    logger.error("Failed to remove prompt from collection", {
      error,
      collectionId,
      sharedPromptId,
    });
    return { success: false, error: "Failed to remove prompt from collection" };
  }
}

/**
 * Get all prompts in a collection
 */
export async function getCollectionPrompts(collectionId: string) {
  try {
    const user = await requireAuth();

    // Verify collection access
    const collection = await db.collection.findFirst({
      where: {
        id: collectionId,
        OR: [{ userId: user.id }, { isPublic: true }],
      },
    });

    if (!collection) {
      return { success: false, error: "Collection not found" };
    }

    const prompts = await db.collectionPrompt.findMany({
      where: { collectionId },
      include: {
        sharedPrompt: {
          include: {
            prompt: {
              select: {
                title: true,
                description: true,
              },
            },
            user: {
              select: {
                name: true,
                username: true,
              },
            },
            _count: {
              select: {
                likes: true,
                copies: true,
              },
            },
          },
        },
      },
      orderBy: { addedAt: "desc" },
    });

    logger.info("Retrieved collection prompts", {
      collectionId,
      userId: user.id,
      count: prompts.length,
    });

    return { success: true, prompts };
  } catch (error) {
    logger.error("Failed to get collection prompts", { error, collectionId });
    return { success: false, error: "Failed to retrieve collection prompts" };
  }
}
