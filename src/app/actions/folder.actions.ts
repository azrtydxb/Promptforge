"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { Folder } from '@/generated/prisma';
import {
  onFolderCreate,
  onFolderUpdate,
  onFolderDelete,
  onFolderMove
} from '@/lib/cache-manager';

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

export async function getFolders() {
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
}

interface CreateFolderParams {
  name: string;
  parentId?: string | null;
}

export async function createFolder({ name, parentId }: CreateFolderParams) {
  try {
    const user = await requireAuth();

    const lastFolder = await db.folder.findFirst({
      where: { userId: user.id, parentId },
      orderBy: { order: "desc" },
    });

    const newOrder = lastFolder ? lastFolder.order! + 1 : 0;

    const newFolder = await db.folder.create({
      data: {
        name,
        userId: user.id,
        parentId,
        order: newOrder,
      },
    });

    // Cache invalidation
    await onFolderCreate(user.id);

    // Revalidate the entire prompts layout to ensure all folder-related components refresh
    revalidatePath("/prompts", "layout");
    return newFolder;
  } catch (_error) {
    throw _error;
  }
}

export async function updateFolder(id: string, name: string) {
  try {
    const user = await requireAuth();

    const updatedFolder = await db.folder.update({
      where: { id, userId: user.id },
      data: { name },
    });

    // Cache invalidation
    await onFolderUpdate(user.id, id);

    revalidatePath("/prompts");
    return updatedFolder;
  } catch (_error) {
    throw _error;
  }
}

export async function deleteFolder(id: string) {
  try {
    const user = await requireAuth();

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
    }

    // Start the recursive deletion
    await deleteFolderRecursively(id);

    // Cache invalidation
    await onFolderDelete(user.id, id);

    revalidatePath("/prompts");
    return { success: true, deletedId: id };
  } catch (_error) {
    throw _error;
  }
}

export async function moveFolder(id: string, parentId: string | null, order: number) {
  const user = await requireAuth();

  await db.folder.update({
    where: { id, userId: user.id },
    data: { parentId, order },
  });

  // Cache invalidation
  await onFolderMove(user.id, id);

  revalidatePath("/prompts");
}