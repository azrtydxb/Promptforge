"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { TeamRole, TeamAction, InvitationStatus } from "@/generated/prisma";
import { canPerformAction, getUserTeamRole } from "./team.actions";
import { addDays } from "date-fns";
import { randomBytes } from "crypto";
import { sendTeamInvitationEmail } from "@/lib/email";

// Team Member Management

interface InviteMemberParams {
  teamId: string;
  email: string;
  role?: TeamRole;
}

export async function inviteTeamMember(params: InviteMemberParams) {
  try {
    const user = await requireAuth();
    const userRole = await getUserTeamRole(params.teamId);
    
    // Check if user has permission to invite members
    if (!(await canPerformAction(userRole, TeamRole.ADMIN))) {
      throw new Error("Insufficient permissions to invite members");
    }
    
    // Check if email is already a member
    const existingUser = await db.user.findUnique({
      where: { email: params.email },
    });
    
    if (existingUser) {
      const existingMember = await db.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: params.teamId,
            userId: existingUser.id,
          },
        },
      });
      
      if (existingMember) {
        throw new Error("User is already a member of this team");
      }
    }
    
    // Check if there's already a pending invitation
    const existingInvitation = await db.teamInvitation.findFirst({
      where: {
        teamId: params.teamId,
        email: params.email,
        status: InvitationStatus.PENDING,
      },
    });
    
    if (existingInvitation) {
      throw new Error("An invitation has already been sent to this email");
    }
    
    // Create invitation token
    const token = randomBytes(32).toString('hex');
    const expiresAt = addDays(new Date(), 7); // 7 days expiration
    
    // Create the invitation
    const invitation = await db.teamInvitation.create({
      data: {
        teamId: params.teamId,
        email: params.email,
        role: params.role || TeamRole.MEMBER,
        invitedById: user.id,
        token,
        expiresAt,
      },
      include: {
        team: true,
        invitedBy: true,
      },
    });
    
    // Log the activity
    await db.teamActivity.create({
      data: {
        teamId: params.teamId,
        userId: user.id,
        action: TeamAction.MEMBER_INVITED,
        entityType: 'invitation',
        entityId: invitation.id,
        metadata: {
          email: params.email,
          role: params.role || TeamRole.MEMBER,
        },
      },
    });
    
    // Send invitation email
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/teams/invitations/${token}`;
    
    await sendTeamInvitationEmail({
      to: params.email,
      teamName: invitation.team.name,
      inviterName: invitation.invitedBy.name || invitation.invitedBy.email || "A team member",
      invitationUrl,
      role: params.role || TeamRole.MEMBER,
    });
    
    logger.info("Team invitation created and email sent", { 
      invitationId: invitation.id, 
      teamId: params.teamId,
      email: params.email,
    });
    
    revalidatePath(`/teams/${params.teamId}/members`);
    
    return { success: true, invitation };
  } catch (_error) {
    logger.error("Error inviting team member", error);
    throw _error;
  }
}

export async function acceptTeamInvitation(token: string) {
  try {
    const user = await requireAuth();
    
    // Find the invitation
    const invitation = await db.teamInvitation.findUnique({
      where: { token },
      include: {
        team: true,
      },
    });
    
    if (!invitation) {
      throw new Error("Invalid invitation token");
    }
    
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error("This invitation has already been used");
    }
    
    if (new Date() > invitation.expiresAt) {
      // Update invitation status to expired
      await db.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new Error("This invitation has expired");
    }
    
    // Check if the invitation email matches the user's email
    if (invitation.email !== user.email) {
      throw new Error("This invitation is for a different email address");
    }
    
    // Add user to the team
    const teamMember = await db.teamMember.create({
      data: {
        teamId: invitation.teamId,
        userId: user.id,
        role: invitation.role,
      },
    });
    
    // Update invitation status
    await db.teamInvitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });
    
    // Log the activity
    await db.teamActivity.create({
      data: {
        teamId: invitation.teamId,
        userId: user.id,
        action: TeamAction.MEMBER_JOINED,
        entityType: 'member',
        entityId: teamMember.id,
        metadata: {
          role: invitation.role,
        },
      },
    });
    
    revalidatePath('/dashboard');
    revalidatePath(`/teams/${invitation.team.id}`);
    
    logger.info("Team invitation accepted", { 
      userId: user.id, 
      teamId: invitation.teamId 
    });
    
    return { success: true, team: invitation.team };
  } catch (_error) {
    logger.error("Error accepting team invitation", error);
    throw _error;
  }
}

export async function declineTeamInvitation(token: string) {
  try {
    const user = await requireAuth();
    
    // Find the invitation
    const invitation = await db.teamInvitation.findUnique({
      where: { token },
    });
    
    if (!invitation) {
      throw new Error("Invalid invitation token");
    }
    
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error("This invitation has already been used");
    }
    
    // Check if the invitation email matches the user's email
    if (invitation.email !== user.email) {
      throw new Error("This invitation is for a different email address");
    }
    
    // Update invitation status
    await db.teamInvitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.DECLINED,
        declinedAt: new Date(),
      },
    });
    
    logger.info("Team invitation declined", { 
      userId: user.id, 
      invitationId: invitation.id 
    });
    
    return { success: true };
  } catch (_error) {
    logger.error("Error declining team invitation", error);
    throw _error;
  }
}

interface UpdateMemberRoleParams {
  teamId: string;
  memberId: string;
  newRole: TeamRole;
}

export async function updateTeamMemberRole(params: UpdateMemberRoleParams) {
  try {
    const user = await requireAuth();
    const userRole = await getUserTeamRole(params.teamId);
    
    // Only owners and admins can change roles
    if (!(await canPerformAction(userRole, TeamRole.ADMIN))) {
      throw new Error("Insufficient permissions to change member roles");
    }
    
    // Get the target member
    const targetMember = await db.teamMember.findUnique({
      where: { id: params.memberId },
      include: { user: true },
    });
    
    if (!targetMember || targetMember.teamId !== params.teamId) {
      throw new Error("Member not found");
    }
    
    // Prevent changing owner role if they're the only owner
    if (targetMember.role === TeamRole.OWNER && params.newRole !== TeamRole.OWNER) {
      const ownerCount = await db.teamMember.count({
        where: {
          teamId: params.teamId,
          role: TeamRole.OWNER,
        },
      });
      
      if (ownerCount === 1) {
        throw new Error("Cannot change role of the only owner. Assign another owner first.");
      }
    }
    
    // Only owners can assign the owner role
    if (params.newRole === TeamRole.OWNER && userRole !== TeamRole.OWNER) {
      throw new Error("Only owners can assign the owner role");
    }
    
    // Update the member's role
    const updatedMember = await db.teamMember.update({
      where: { id: params.memberId },
      data: { role: params.newRole },
    });
    
    // Log the activity
    await db.teamActivity.create({
      data: {
        teamId: params.teamId,
        userId: user.id,
        action: TeamAction.MEMBER_ROLE_CHANGED,
        entityType: 'member',
        entityId: params.memberId,
        entityName: targetMember.user.name || targetMember.user.email,
        metadata: {
          oldRole: targetMember.role,
          newRole: params.newRole,
        },
      },
    });
    
    revalidatePath(`/teams/${params.teamId}/members`);
    
    logger.info("Team member role updated", { 
      teamId: params.teamId,
      memberId: params.memberId,
      newRole: params.newRole 
    });
    
    return { success: true, member: updatedMember };
  } catch (_error) {
    logger.error("Error updating team member role", error);
    throw _error;
  }
}

interface RemoveMemberParams {
  teamId: string;
  memberId: string;
}

export async function removeTeamMember(params: RemoveMemberParams) {
  try {
    const user = await requireAuth();
    const userRole = await getUserTeamRole(params.teamId);
    
    // Get the target member
    const targetMember = await db.teamMember.findUnique({
      where: { id: params.memberId },
      include: { user: true },
    });
    
    if (!targetMember || targetMember.teamId !== params.teamId) {
      throw new Error("Member not found");
    }
    
    // Users can remove themselves, or admins/owners can remove others
    const isRemovingSelf = targetMember.userId === user.id;
    if (!isRemovingSelf && !(await canPerformAction(userRole, TeamRole.ADMIN))) {
      throw new Error("Insufficient permissions to remove members");
    }
    
    // Prevent removing the last owner
    if (targetMember.role === TeamRole.OWNER) {
      const ownerCount = await db.teamMember.count({
        where: {
          teamId: params.teamId,
          role: TeamRole.OWNER,
        },
      });
      
      if (ownerCount === 1) {
        throw new Error("Cannot remove the only owner of the team");
      }
    }
    
    // Remove the member
    await db.teamMember.delete({
      where: { id: params.memberId },
    });
    
    // Log the activity
    await db.teamActivity.create({
      data: {
        teamId: params.teamId,
        userId: user.id,
        action: isRemovingSelf ? TeamAction.MEMBER_LEFT : TeamAction.MEMBER_REMOVED,
        entityType: 'member',
        entityName: targetMember.user.name || targetMember.user.email,
        metadata: {
          removedUserId: targetMember.userId,
          role: targetMember.role,
        },
      },
    });
    
    revalidatePath(`/teams/${params.teamId}/members`);
    if (isRemovingSelf) {
      revalidatePath('/dashboard');
    }
    
    logger.info("Team member removed", { 
      teamId: params.teamId,
      removedUserId: targetMember.userId,
      removedBy: user.id 
    });
    
    return { success: true };
  } catch (_error) {
    logger.error("Error removing team member", error);
    throw _error;
  }
}

export async function getTeamMembers(teamId: string) {
  try {
    await requireAuth();
    const userRole = await getUserTeamRole(teamId);
    
    if (!userRole) {
      throw new Error("You are not a member of this team");
    }
    
    const members = await db.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            username: true,
          },
        },
      },
      orderBy: [
        {
          role: 'desc', // Owner first, then Admin, Member, Viewer
        },
        {
          joinedAt: 'asc',
        },
      ],
    });
    
    return members;
  } catch (_error) {
    logger.error("Error getting team members", error);
    throw _error;
  }
}

export async function getTeamInvitations(teamId: string) {
  try {
    await requireAuth();
    const userRole = await getUserTeamRole(teamId);
    
    // Only admins and owners can view invitations
    if (!(await canPerformAction(userRole, TeamRole.ADMIN))) {
      throw new Error("Insufficient permissions to view invitations");
    }
    
    const invitations = await db.teamInvitation.findMany({
      where: {
        teamId,
        status: InvitationStatus.PENDING,
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return invitations;
  } catch (_error) {
    logger.error("Error getting team invitations", error);
    throw _error;
  }
}