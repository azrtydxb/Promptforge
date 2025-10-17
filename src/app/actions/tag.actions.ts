"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { withPerformance } from "@/lib/performance-wrapper";

export const addTagToPrompt = withPerformance('addTagToPrompt', async (promptId: string, tagName: string) => {
  const user = await requireAuth();

  await db.prompt.update({
    where: { id: promptId, userId: user.id },
    data: {
      tags: {
        connectOrCreate: {
          where: { name: tagName },
          create: { name: tagName },
        },
      },
    },
  });

  revalidatePath(`/prompts/${promptId}`);
});

export const removeTagFromPrompt = withPerformance('removeTagFromPrompt', async (promptId: string, tagName: string) => {
  const user = await requireAuth();

  await db.prompt.update({
    where: { id: promptId, userId: user.id },
    data: {
      tags: {
        disconnect: {
          name: tagName,
        },
      },
    },
  });

  revalidatePath(`/prompts/${promptId}`);
});

export const searchTags = withPerformance('searchTags', async (query: string) => {
  const tags = await db.tag.findMany({
    where: {
      name: {
        contains: query,
        mode: "insensitive",
      },
    },
  });

  return tags;
});