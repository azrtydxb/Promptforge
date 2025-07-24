"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

interface ShareSettings {
  expiresIn?: "1h" | "1d" | "7d" | "30d" | "never";
  password?: string;
  maxViews?: number;
  showAuthor?: boolean;
  allowEmbed?: boolean;
}

interface CreateShareLinkParams {
  promptId: string;
  title?: string;
  description?: string;
  settings: ShareSettings;
}

// Generate unique share ID
async function generateShareId(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const shareId = `pf-${nanoid(8)}`;
    
    // Check if ID already exists
    const existing = await db.promptShareLink.findUnique({
      where: { shareId }
    });
    
    if (!existing) {
      return shareId;
    }
    
    attempts++;
  }
  
  throw new Error("Failed to generate unique share ID");
}

// Calculate expiration date based on setting
function calculateExpirationDate(expiresIn: string): Date | null {
  if (expiresIn === "never") return null;
  
  const now = new Date();
  switch (expiresIn) {
    case "1h":
      return new Date(now.getTime() + 60 * 60 * 1000);
    case "1d":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

// Create a share link
export async function createShareLink({
  promptId,
  title,
  description,
  settings
}: CreateShareLinkParams) {
  try {
    const user = await requireAuth();
    
    // Verify prompt ownership
    const prompt = await db.prompt.findUnique({
      where: {
        id: promptId,
        userId: user.id
      },
      include: {
        tags: true
      }
    });
    
    if (!prompt) {
      throw new Error("Prompt not found or unauthorized");
    }
    
    // Check rate limit - max 10 share links per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentLinks = await db.promptShareLink.count({
      where: {
        userId: user.id,
        createdAt: { gte: oneHourAgo }
      }
    });
    
    if (recentLinks >= 10) {
      throw new Error("Rate limit exceeded. Maximum 10 share links per hour.");
    }
    
    // Generate share ID
    const shareId = await generateShareId();
    
    // Hash password if provided
    let hashedPassword = null;
    if (settings.password) {
      hashedPassword = await bcrypt.hash(settings.password, 10);
    }
    
    // Calculate expiration
    const expiresAt = settings.expiresIn ? 
      calculateExpirationDate(settings.expiresIn) : null;
    
    // Create share link
    await db.promptShareLink.create({
      data: {
        promptId,
        userId: user.id,
        shareId,
        title: title || prompt.title,
        description: description || prompt.description || "",
        content: prompt.content || "",
        tags: prompt.tags.map(tag => tag.name),
        settings: {
          showAuthor: settings.showAuthor ?? true,
          allowEmbed: settings.allowEmbed ?? false,
          expiresIn: settings.expiresIn || "never"
        },
        expiresAt,
        password: hashedPassword,
        maxViews: settings.maxViews
      }
    });
    
    logger.info("Share link created", { 
      shareId, 
      promptId, 
      userId: user.id 
    });
    
    return {
      success: true,
      shareId,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/share/${shareId}`
    };
  } catch (error) {
    logger.error("Error creating share link", error);
    throw error;
  }
}

// Get user's share links
export async function getUserShareLinks() {
  try {
    const user = await requireAuth();
    
    const shareLinks = await db.promptShareLink.findMany({
      where: {
        userId: user.id
      },
      include: {
        prompt: {
          select: {
            id: true,
            title: true
          }
        },
        _count: {
          select: {
            views: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    
    return shareLinks.map(link => ({
      ...link,
      viewCount: link._count.views,
      isExpired: link.expiresAt ? new Date() > link.expiresAt : false
    }));
  } catch (error) {
    logger.error("Error fetching user share links", error);
    throw error;
  }
}

// Get public share link data (no auth required)
export async function getShareLink(shareId: string) {
  try {
    const shareLink = await db.promptShareLink.findUnique({
      where: {
        shareId,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true
          }
        }
      }
    });
    
    if (!shareLink) {
      return null;
    }
    
    // Check if expired
    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      return { expired: true };
    }
    
    // Check view limit
    if (shareLink.maxViews) {
      const viewCount = await db.promptShareView.count({
        where: { shareLinkId: shareLink.id }
      });
      
      if (viewCount >= shareLink.maxViews) {
        return { viewLimitReached: true };
      }
    }
    
    // Don't return password hash to client
    const { password, ...shareLinkData } = shareLink;
    
    return {
      ...shareLinkData,
      hasPassword: !!password,
      settings: shareLink.settings as ShareSettings
    };
  } catch (error) {
    logger.error("Error fetching share link", error);
    return null;
  }
}

// Validate share access (for password-protected links)
export async function validateShareAccess(shareId: string, password?: string) {
  try {
    const shareLink = await db.promptShareLink.findUnique({
      where: {
        shareId,
        isActive: true
      }
    });
    
    if (!shareLink) {
      return { valid: false, reason: "not_found" };
    }
    
    // Check expiration
    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      return { valid: false, reason: "expired" };
    }
    
    // Check password if required
    if (shareLink.password) {
      if (!password) {
        return { valid: false, reason: "password_required" };
      }
      
      const isValid = await bcrypt.compare(password, shareLink.password);
      if (!isValid) {
        return { valid: false, reason: "invalid_password" };
      }
    }
    
    return { valid: true };
  } catch (error) {
    logger.error("Error validating share access", error);
    return { valid: false, reason: "error" };
  }
}

// Record a view of the shared prompt
export async function recordShareView(shareId: string) {
  try {
    const shareLink = await db.promptShareLink.findUnique({
      where: {
        shareId,
        isActive: true
      }
    });
    
    if (!shareLink) {
      return;
    }
    
    // Get request headers for metadata
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || undefined;
    const referer = headersList.get("referer") || undefined;
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ipAddress = forwardedFor || realIp || undefined;
    
    // Record the view
    await db.promptShareView.create({
      data: {
        shareLinkId: shareLink.id,
        ipAddress,
        userAgent,
        referer
      }
    });
    
    logger.info("Share view recorded", { shareId });
  } catch (error) {
    logger.error("Error recording share view", error);
  }
}

// Update share link settings
export async function updateShareLink(
  shareLinkId: string, 
  updates: Partial<CreateShareLinkParams["settings"]> & {
    title?: string;
    description?: string;
    isActive?: boolean;
  }
) {
  try {
    const user = await requireAuth();
    
    // Verify ownership
    const shareLink = await db.promptShareLink.findUnique({
      where: {
        id: shareLinkId,
        userId: user.id
      }
    });
    
    if (!shareLink) {
      throw new Error("Share link not found or unauthorized");
    }
    
    // Prepare update data
    const updateData: Record<string, unknown> = {};
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    
    // Update password if provided
    if (updates.password !== undefined) {
      updateData.password = updates.password ? 
        await bcrypt.hash(updates.password, 10) : null;
    }
    
    // Update expiration if provided
    if (updates.expiresIn !== undefined) {
      updateData.expiresAt = calculateExpirationDate(updates.expiresIn);
    }
    
    // Update max views
    if (updates.maxViews !== undefined) {
      updateData.maxViews = updates.maxViews;
    }
    
    // Update settings
    if (updates.showAuthor !== undefined || updates.allowEmbed !== undefined) {
      const currentSettings = shareLink.settings as ShareSettings;
      updateData.settings = {
        ...currentSettings,
        ...(updates.showAuthor !== undefined && { showAuthor: updates.showAuthor }),
        ...(updates.allowEmbed !== undefined && { allowEmbed: updates.allowEmbed })
      };
    }
    
    // Perform update
    const updated = await db.promptShareLink.update({
      where: { id: shareLinkId },
      data: updateData
    });
    
    logger.info("Share link updated", { shareLinkId, userId: user.id });
    
    revalidatePath("/prompts");
    return { success: true, shareLink: updated };
  } catch (error) {
    logger.error("Error updating share link", error);
    throw error;
  }
}

// Delete (deactivate) share link
export async function deleteShareLink(shareLinkId: string) {
  try {
    const user = await requireAuth();
    
    // Verify ownership and soft delete
    const updated = await db.promptShareLink.updateMany({
      where: {
        id: shareLinkId,
        userId: user.id
      },
      data: {
        isActive: false
      }
    });
    
    if (updated.count === 0) {
      throw new Error("Share link not found or unauthorized");
    }
    
    logger.info("Share link deleted", { shareLinkId, userId: user.id });
    
    revalidatePath("/prompts");
    return { success: true };
  } catch (error) {
    logger.error("Error deleting share link", error);
    throw error;
  }
}

// Get share link analytics
export async function getShareLinkAnalytics(shareLinkId: string) {
  try {
    const user = await requireAuth();
    
    // Verify ownership
    const shareLink = await db.promptShareLink.findUnique({
      where: {
        id: shareLinkId,
        userId: user.id
      }
    });
    
    if (!shareLink) {
      throw new Error("Share link not found or unauthorized");
    }
    
    // Get view statistics
    const totalViews = await db.promptShareView.count({
      where: { shareLinkId }
    });
    
    const uniqueIPs = await db.promptShareView.groupBy({
      by: ["ipAddress"],
      where: { 
        shareLinkId,
        ipAddress: { not: null }
      }
    });
    
    const recentViews = await db.promptShareView.findMany({
      where: { shareLinkId },
      orderBy: { viewedAt: "desc" },
      take: 10,
      select: {
        viewedAt: true,
        ipAddress: true,
        referer: true
      }
    });
    
    // Get daily view counts for the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dailyViews = await db.promptShareView.groupBy({
      by: ["viewedAt"],
      where: {
        shareLinkId,
        viewedAt: { gte: sevenDaysAgo }
      },
      _count: true
    });
    
    return {
      totalViews,
      uniqueVisitors: uniqueIPs.length,
      recentViews,
      dailyViews,
      shareLink
    };
  } catch (error) {
    logger.error("Error fetching share link analytics", error);
    throw error;
  }
}