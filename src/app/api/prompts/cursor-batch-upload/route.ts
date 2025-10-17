"use server";

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

interface PromptToCreate {
  title: string;
  description?: string;
  content: string;
  tags: string[];
}

export async function POST(request: Request) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is pascal@watteel.com (optional safety check)
    const email = user.email;
    if (email !== "pascal@watteel.com") {
      return NextResponse.json(
        { error: "Only pascal@watteel.com can use this endpoint" },
        { status: 403 }
      );
    }

    const { prompts } = (await request.json()) as {
      prompts: PromptToCreate[];
    };

    if (!Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json(
        { error: "No prompts provided" },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const promptData of prompts) {
      try {
        const lastPrompt = await db.prompt.findFirst({
          where: { userId: user.id, folderId: null },
          orderBy: { order: "desc" },
        });

        const newOrder = lastPrompt ? lastPrompt.order! + 1 : 0;

        const newPrompt = await db.prompt.create({
          data: {
            title: promptData.title,
            description: promptData.description,
            content: promptData.content,
            userId: user.id,
            folderId: null,
            order: newOrder,
            tags: {
              connectOrCreate: promptData.tags.map((tag) => ({
                where: { name: tag },
                create: { name: tag },
              })),
            },
            versions: {
              create: {
                content: promptData.content || "",
                version: "1.0",
                changeMessage: "Initial version from Cursor Directory",
              },
            },
          },
          include: {
            tags: true,
          },
        });

        results.push({
          success: true,
          title: promptData.title,
          id: newPrompt.id,
        });
      } catch (err) {
        errors.push({
          success: false,
          title: promptData.title,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalProcessed: prompts.length,
      successCount: results.length,
      errorCount: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Batch upload error:", error);
    return NextResponse.json(
      {
        error: "Failed to process batch upload",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
