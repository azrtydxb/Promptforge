"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";

export async function saveSearchToHistory(params: {
  query: string;
  searchType: string;
  filters?: Record<string, unknown>;
  resultCount: number;
}) {
  try {
    const user = await requireAuth();

    const searchEntry = await db.searchHistory.create({
      data: {
        userId: user.id,
        query: params.query,
        searchType: params.searchType,
        filters: (params.filters || {}) as Prisma.InputJsonValue,
        resultCount: params.resultCount,
      },
    });

    return { success: true, searchEntry };
  } catch (_error) {

    return { success: false, error: "Failed to save search history" };
  }
}

export async function updateSearchClick(searchHistoryId: string, promptId: string) {
  try {
    const user = await requireAuth();

    const updated = await db.searchHistory.update({
      where: {
        id: searchHistoryId,
        userId: user.id,
      },
      data: {
        clickedPromptId: promptId,
      },
    });

    return { success: true, updated };
  } catch (_error) {

    return { success: false, error: "Failed to update search click" };
  }
}

export async function getSearchHistory(limit: number = 10) {
  try {
    const user = await requireAuth();

    const history = await db.searchHistory.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      include: {
        clickedPrompt: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return history;
  } catch (_error) {

    return [];
  }
}

export async function deleteSearchHistory(searchHistoryId?: string) {
  try {
    const user = await requireAuth();

    if (searchHistoryId) {
      // Delete specific entry
      await db.searchHistory.delete({
        where: {
          id: searchHistoryId,
          userId: user.id,
        },
      });
    } else {
      // Delete all history for user
      await db.searchHistory.deleteMany({
        where: {
          userId: user.id,
        },
      });
    }

    revalidatePath("/prompts");
    return { success: true };
  } catch (_error) {

    return { success: false, error: "Failed to delete search history" };
  }
}

export async function getPopularSearches(limit: number = 5) {
  try {
    const user = await requireAuth();

    // Get most frequent searches for the user
    const popularSearches = await db.searchHistory.groupBy({
      by: ["query"],
      where: {
        userId: user.id,
        query: {
          not: "",
        },
      },
      _count: {
        query: true,
      },
      orderBy: {
        _count: {
          query: "desc",
        },
      },
      take: limit,
    });

    return popularSearches.map(search => ({
      query: search.query,
      count: search._count.query,
    }));
  } catch (_error) {

    return [];
  }
}

export async function getSuggestedSearches(partialQuery: string, limit: number = 5) {
  try {
    const user = await requireAuth();

    if (!partialQuery || partialQuery.length < 2) {
      return [];
    }

    // Get unique searches that match the partial query
    const suggestions = await db.searchHistory.findMany({
      where: {
        userId: user.id,
        query: {
          contains: partialQuery,
          mode: "insensitive",
        },
      },
      distinct: ["query"],
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      select: {
        query: true,
      },
    });

    return suggestions.map(s => s.query);
  } catch (_error) {

    return [];
  }
}