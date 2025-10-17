"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { Folder } from '@/generated/prisma';
import { withPerformance } from "@/lib/performance-wrapper";

// Type for folder with nested children
type FolderWithChildren = Folder & {
  children?: FolderWithChildren[];
};

// Helper function to recursively sort folders and their children
function sortFoldersRecursively(folders: FolderWithChildren[]): FolderWithChildren[] {
  return folders
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(folder => ({
      ...folder,
      children: folder.children ? sortFoldersRecursively(folder.children) : []
    }));
}

export const getFolders = withPerformance('getFolders', async () => {
  const user = await requireAuth();

  // Only fetch root-level folders (parentId is null) with their nested children
  const folders = await db.folder.findMany({
    where: {
      userId: user.id,
      parentId: null  // Only get top-level folders
    },
    include: {
      children: {
        include: {
          children: {
            include: {
              children: {
                include: {
                  children: {
                    include: {
                      children: true
                    }
                  }
                }
              }
            }
          }
        }
      },
    },
    orderBy: {
      order: "asc",
    },
  });

  // Apply recursive sorting to ensure all nested children are properly ordered
  return sortFoldersRecursively(folders);
});

interface CreateFolderParams {
  name: string;
  parentId?: string | null;
}

export const createFolder = withPerformance('createFolder', async ({ name, parentId }: CreateFolderParams) => {
  console.log("SERVER ACTION: createFolder called with:", { name, parentId });

  try {
    const user = await requireAuth();
    console.log("SERVER ACTION: User authenticated:", user.id);

    const lastFolder = await db.folder.findFirst({
      where: { userId: user.id, parentId },
      orderBy: { order: "desc" },
    });

    const newOrder = lastFolder ? lastFolder.order! + 1 : 0;
    console.log("SERVER ACTION: Creating folder with order:", newOrder);

    const newFolder = await db.folder.create({
      data: {
        name,
        userId: user.id,
        parentId,
        order: newOrder,
      },
    });

    console.log("SERVER ACTION: Folder created successfully:", newFolder);
    // Revalidate the entire prompts layout to ensure all folder-related components refresh
    revalidatePath("/prompts", "layout");
    return newFolder;
  } catch (error) {
    console.error("SERVER ACTION: Error in createFolder:", error);
    throw error;
  }
});

export const updateFolder = withPerformance('updateFolder', async (id: string, name: string) => {
  console.log("SERVER ACTION: updateFolder called with:", { id, name });

  try {
    const user = await requireAuth();
    console.log("SERVER ACTION: User authenticated:", user.id);

    const updatedFolder = await db.folder.update({
      where: { id, userId: user.id },
      data: { name },
    });

    console.log("SERVER ACTION: Folder updated successfully:", updatedFolder);
    revalidatePath("/prompts");
    return updatedFolder;
  } catch (error) {
    console.error("SERVER ACTION: Error in updateFolder:", error);
    throw error;
  }
});

export const deleteFolder = withPerformance('deleteFolder', async (id: string) => {
  console.log("SERVER ACTION: deleteFolder called with:", { id });

  try {
    const user = await requireAuth();
    console.log("SERVER ACTION: User authenticated:", user.id);

    // Recursive function to delete folder and all its children
    async function deleteFolderRecursively(folderId: string) {
      // First, find all child folders
      const childFolders = await db.folder.findMany({
        where: { parentId: folderId, userId: user.id },
      });

      // Recursively delete all child folders
      for (const childFolder of childFolders) {
        await deleteFolderRecursively(childFolder.id);
      }

      // Delete all prompts in this folder (set folderId to null)
      await db.prompt.updateMany({
        where: { folderId: folderId, userId: user.id },
        data: { folderId: null },
      });

      // Finally, delete the folder itself
      await db.folder.delete({
        where: { id: folderId, userId: user.id },
      });

      console.log("SERVER ACTION: Folder deleted recursively:", folderId);
    }

    // Start the recursive deletion
    await deleteFolderRecursively(id);

    console.log("SERVER ACTION: Folder and all children deleted successfully:", id);
    revalidatePath("/prompts");
    return { success: true, deletedId: id };
  } catch (error) {
    console.error("SERVER ACTION: Error in deleteFolder:", error);
    throw error;
  }
});

export const moveFolder = withPerformance('moveFolder', async (id: string, parentId: string | null, order: number) => {
  const user = await requireAuth();

  await db.folder.update({
    where: { id, userId: user.id },
    data: { parentId, order },
  });

  revalidatePath("/prompts");
});