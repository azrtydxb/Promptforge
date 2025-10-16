"use server";

import { cookies } from "next/headers";
import { requireAuth } from "@/lib/auth";
import { getUserTeamRole } from "./team.actions";
import { logger } from "@/lib/logger";

const TEAM_CONTEXT_COOKIE = "promptforge_team_context";

export interface TeamContext {
  teamId: string | null;
  teamSlug: string | null;
}

export async function setTeamContext(teamId: string | null) {
  try {
    const user = await requireAuth();
    
    if (teamId) {
      // Verify user is a member of the team
      const userRole = await getUserTeamRole(teamId);
      if (!userRole) {
        throw new Error("You are not a member of this team");
      }
    }
    
    const cookieStore = await cookies();
    
    if (teamId) {
      cookieStore.set(TEAM_CONTEXT_COOKIE, teamId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    } else {
      cookieStore.delete(TEAM_CONTEXT_COOKIE);
    }
    
    logger.info("Team context updated", { userId: user.id, teamId });
    
    return { success: true, teamId };
  } catch (error) {
    logger.error("Error setting team context", error);
    throw error;
  }
}

export async function getTeamContext(): Promise<TeamContext> {
  try {
    const cookieStore = await cookies();
    const teamId = cookieStore.get(TEAM_CONTEXT_COOKIE)?.value || null;

    if (!teamId) {
      return { teamId: null, teamSlug: null };
    }

    // Verify the team still exists and user is still a member
    await requireAuth();
    const userRole = await getUserTeamRole(teamId);
    
    if (!userRole) {
      // User is no longer a member, clear the context
      cookieStore.delete(TEAM_CONTEXT_COOKIE);
      return { teamId: null, teamSlug: null };
    }
    
    // Get team slug for URL generation
    const { db } = await import("@/lib/db");
    const team = await db.team.findUnique({
      where: { id: teamId },
      select: { slug: true },
    });
    
    return {
      teamId,
      teamSlug: team?.slug || null,
    };
  } catch (error) {
    logger.error("Error getting team context", error);
    return { teamId: null, teamSlug: null };
  }
}

export async function clearTeamContext() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(TEAM_CONTEXT_COOKIE);
    
    logger.info("Team context cleared");
    
    return { success: true };
  } catch (error) {
    logger.error("Error clearing team context", error);
    throw error;
  }
}

// Helper to check if current context is team or personal
export async function isInTeamContext(): Promise<boolean> {
  const context = await getTeamContext();
  return context.teamId !== null;
}

// Get the current context type
export async function getCurrentContextType(): Promise<"personal" | "team"> {
  const context = await getTeamContext();
  return context.teamId ? "team" : "personal";
}