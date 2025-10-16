"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CreateTagSchema = z.object({
  name: z.string().min(1, "Tag name is required").max(50, "Tag name must be less than 50 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
});

const UpdateTagSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Tag name is required").max(50, "Tag name must be less than 50 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
});

export async function createTag(data: z.infer<typeof CreateTagSchema>) {
  try {
    const validatedData = CreateTagSchema.parse(data);

    // Check if tag with this name already exists
    const existingTag = await db.tag.findUnique({
      where: {
        name: validatedData.name
      }
    });

    if (existingTag) {
      throw new Error("A tag with this name already exists");
    }

    const newTag = await db.tag.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
      },
      include: {
        _count: {
          select: {
            prompts: true
          }
        }
      }
    });

    console.log("SERVER ACTION: Tag created successfully:", newTag);
    revalidatePath("/tags");
    return newTag;
  } catch (error) {
    console.error("Error creating tag:", error);
    throw error;
  }
}

export async function updateTag(data: z.infer<typeof UpdateTagSchema>) {
  try {
    const validatedData = UpdateTagSchema.parse(data);

    // Check if another tag with this name already exists (excluding current tag)
    const existingTag = await db.tag.findFirst({
      where: {
        name: validatedData.name,
        NOT: {
          id: validatedData.id
        }
      }
    });

    if (existingTag) {
      throw new Error("A tag with this name already exists");
    }

    const updatedTag = await db.tag.update({
      where: {
        id: validatedData.id
      },
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
      },
      include: {
        _count: {
          select: {
            prompts: true
          }
        }
      }
    });

    console.log("SERVER ACTION: Tag updated successfully:", updatedTag);
    revalidatePath("/tags");
    return updatedTag;
  } catch (error) {
    console.error("Error updating tag:", error);
    throw error;
  }
}

export async function deleteTag(id: string) {
  try {
    // Check if tag exists and get prompt count
    const tag = await db.tag.findUnique({
      where: {
        id
      },
      include: {
        _count: {
          select: {
            prompts: true
          }
        }
      }
    });

    if (!tag) {
      throw new Error("Tag not found");
    }

    // If tag has prompts, we should disconnect them first
    if (tag._count.prompts > 0) {
      await db.tag.update({
        where: {
          id
        },
        data: {
          prompts: {
            set: [] // Disconnect all prompts
          }
        }
      });
    }

    // Now delete the tag
    await db.tag.delete({
      where: {
        id
      }
    });

    console.log("SERVER ACTION: Tag deleted successfully:", id);
    revalidatePath("/tags");
  } catch (error) {
    console.error("Error deleting tag:", error);
    throw error;
  }
}

export async function getAllTags() {
  try {
    const tags = await db.tag.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        _count: {
          select: {
            prompts: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return tags;
  } catch (error) {
    console.error("Error fetching tags:", error);
    throw error;
  }
}

export async function getTagsWithPrompts() {
  try {
    const user = await requireAuth();

    const tags = await db.tag.findMany({
      include: {
        prompts: {
          where: {
            userId: user.id
          },
          select: {
            id: true,
            title: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            tags: true,
          },
          orderBy: {
            updatedAt: 'desc'
          }
        },
        _count: {
          select: {
            prompts: {
              where: {
                userId: user.id
              }
            }
          }
        }
      },
      orderBy: [
        {
          prompts: {
            _count: 'desc'
          }
        },
        {
          name: 'asc'
        }
      ]
    });

    return tags;
  } catch (error) {
    console.error("Error fetching tags with prompts:", error);
    throw error;
  }
}
