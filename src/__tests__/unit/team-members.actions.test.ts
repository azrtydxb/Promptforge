import {
  inviteTeamMember,
  acceptTeamInvitation,
  declineTeamInvitation,
  updateTeamMemberRole,
  removeTeamMember,
  getTeamMembers,
  getTeamInvitations
} from '@/app/actions/team-members.actions'
import { getUserTeamRole, canPerformAction } from '@/app/actions/team.actions'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { sendTeamInvitationEmail } from '@/lib/email'
import { TeamRole, TeamAction, InvitationStatus } from '@/generated/prisma'
import { revalidatePath } from 'next/cache'
import { addDays } from 'date-fns'

// Mock dependencies
jest.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: jest.fn(),
    },
    team: {
      findUnique: jest.fn(),
    },
    teamMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    teamInvitation: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    teamActivity: {
      create: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('@/lib/email', () => ({
  sendTeamInvitationEmail: jest.fn(),
}))

jest.mock('@/app/actions/team.actions', () => ({
  getUserTeamRole: jest.fn(),
  canPerformAction: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'mock-token-12345'),
  })),
}))

// Set up environment variable
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

describe('Team Members Actions', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com', name: 'Test User' }
  const mockTeam = {
    id: 'team-123',
    name: 'Test Team',
    slug: 'test-team',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(requireAuth as jest.Mock).mockResolvedValue(mockUser)
  })

  describe('inviteTeamMember', () => {
    const inviteParams = {
      teamId: 'team-123',
      email: 'newuser@example.com',
      role: TeamRole.MEMBER,
    }

    beforeEach(() => {
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(TeamRole.ADMIN)
      ;(canPerformAction as jest.Mock).mockReturnValue(true)
    })

    it('should successfully invite a new member', async () => {
      const mockInvitation = {
        id: 'invitation-123',
        teamId: inviteParams.teamId,
        email: inviteParams.email,
        role: inviteParams.role,
        invitedById: mockUser.id,
        token: 'mock-token-12345',
        expiresAt: addDays(new Date(), 7),
        status: InvitationStatus.PENDING,
        team: mockTeam,
        invitedBy: mockUser,
      }

      ;(db.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(db.teamInvitation.findFirst as jest.Mock).mockResolvedValue(null)
      ;(db.teamInvitation.create as jest.Mock).mockResolvedValue(mockInvitation)

      const result = await inviteTeamMember(inviteParams)

      expect(result.success).toBe(true)
      expect(result.invitation).toEqual(mockInvitation)
      
      expect(db.teamInvitation.create).toHaveBeenCalledWith({
        data: {
          teamId: inviteParams.teamId,
          email: inviteParams.email,
          role: inviteParams.role,
          invitedById: mockUser.id,
          token: 'mock-token-12345',
          expiresAt: expect.any(Date),
        },
        include: {
          team: true,
          invitedBy: true,
        },
      })

      expect(db.teamActivity.create).toHaveBeenCalledWith({
        data: {
          teamId: inviteParams.teamId,
          userId: mockUser.id,
          action: TeamAction.MEMBER_INVITED,
          entityType: 'invitation',
          entityId: mockInvitation.id,
          metadata: {
            email: inviteParams.email,
            role: inviteParams.role,
          },
        },
      })

      expect(sendTeamInvitationEmail).toHaveBeenCalledWith({
        to: inviteParams.email,
        teamName: mockTeam.name,
        inviterName: mockUser.name,
        invitationUrl: 'http://localhost:3000/teams/invitations/mock-token-12345',
        role: inviteParams.role,
      })

      expect(revalidatePath).toHaveBeenCalledWith(`/teams/${inviteParams.teamId}/members`)
    })

    it('should use default role when not specified', async () => {
      const paramsWithoutRole = {
        teamId: 'team-123',
        email: 'newuser@example.com',
      }

      ;(db.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(db.teamInvitation.findFirst as jest.Mock).mockResolvedValue(null)
      ;(db.teamInvitation.create as jest.Mock).mockResolvedValue({
        id: 'invitation-123',
        role: TeamRole.MEMBER,
        team: mockTeam,
        invitedBy: mockUser,
      })

      await inviteTeamMember(paramsWithoutRole)

      expect(db.teamInvitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: TeamRole.MEMBER,
          }),
        })
      )
    })

    it('should throw error when user lacks permission', async () => {
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(TeamRole.MEMBER)
      ;(canPerformAction as jest.Mock).mockReturnValue(false)

      await expect(inviteTeamMember(inviteParams)).rejects.toThrow('Insufficient permissions to invite members')
      expect(db.teamInvitation.create).not.toHaveBeenCalled()
    })

    it('should throw error when user is already a member', async () => {
      const existingUser = { id: 'existing-user', email: inviteParams.email }
      
      ;(db.user.findUnique as jest.Mock).mockResolvedValue(existingUser)
      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue({
        userId: existingUser.id,
        teamId: inviteParams.teamId,
        role: TeamRole.MEMBER,
      })

      await expect(inviteTeamMember(inviteParams)).rejects.toThrow('User is already a member of this team')
    })

    it('should throw error when invitation already exists', async () => {
      ;(db.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(db.teamInvitation.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-invitation',
        email: inviteParams.email,
        status: InvitationStatus.PENDING,
      })

      await expect(inviteTeamMember(inviteParams)).rejects.toThrow('An invitation has already been sent to this email')
    })

    it('should handle email sending failure', async () => {
      ;(db.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(db.teamInvitation.findFirst as jest.Mock).mockResolvedValue(null)
      ;(db.teamInvitation.create as jest.Mock).mockResolvedValue({
        id: 'invitation-123',
        team: mockTeam,
        invitedBy: mockUser,
      })
      ;(sendTeamInvitationEmail as jest.Mock).mockRejectedValue(new Error('Email service error'))

      await expect(inviteTeamMember(inviteParams)).rejects.toThrow('Email service error')
      expect(logger.error).toHaveBeenCalledWith('Error inviting team member', expect.any(Error))
    })
  })

  describe('acceptTeamInvitation', () => {
    const token = 'valid-token-12345'
    const mockInvitation = {
      id: 'invitation-123',
      teamId: 'team-123',
      email: mockUser.email,
      role: TeamRole.MEMBER,
      token,
      status: InvitationStatus.PENDING,
      expiresAt: addDays(new Date(), 1),
      team: mockTeam,
    }

    it('should successfully accept invitation', async () => {
      ;(db.teamInvitation.findUnique as jest.Mock).mockResolvedValue(mockInvitation)
      ;(db.teamMember.create as jest.Mock).mockResolvedValue({
        id: 'member-123',
        teamId: mockInvitation.teamId,
        userId: mockUser.id,
        role: mockInvitation.role,
      })

      const result = await acceptTeamInvitation(token)

      expect(result.success).toBe(true)
      expect(result.team).toEqual(mockTeam)

      expect(db.teamMember.create).toHaveBeenCalledWith({
        data: {
          teamId: mockInvitation.teamId,
          userId: mockUser.id,
          role: mockInvitation.role,
        },
      })

      expect(db.teamInvitation.update).toHaveBeenCalledWith({
        where: { id: mockInvitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: expect.any(Date),
        },
      })

      expect(db.teamActivity.create).toHaveBeenCalledWith({
        data: {
          teamId: mockInvitation.teamId,
          userId: mockUser.id,
          action: TeamAction.MEMBER_JOINED,
          entityType: 'member',
          entityId: 'member-123',
          metadata: {
            role: mockInvitation.role,
          },
        },
      })

      expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
      expect(revalidatePath).toHaveBeenCalledWith(`/teams/${mockTeam.id}`)
    })

    it('should throw error for invalid token', async () => {
      ;(db.teamInvitation.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(acceptTeamInvitation('invalid-token')).rejects.toThrow('Invalid invitation token')
    })

    it('should throw error for already used invitation', async () => {
      ;(db.teamInvitation.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvitation,
        status: InvitationStatus.ACCEPTED,
      })

      await expect(acceptTeamInvitation(token)).rejects.toThrow('This invitation has already been used')
    })

    it('should throw error for expired invitation', async () => {
      const expiredInvitation = {
        ...mockInvitation,
        expiresAt: addDays(new Date(), -1),
      }

      ;(db.teamInvitation.findUnique as jest.Mock).mockResolvedValue(expiredInvitation)

      await expect(acceptTeamInvitation(token)).rejects.toThrow('This invitation has expired')

      expect(db.teamInvitation.update).toHaveBeenCalledWith({
        where: { id: expiredInvitation.id },
        data: { status: InvitationStatus.EXPIRED },
      })
    })

    it('should throw error when email does not match', async () => {
      ;(db.teamInvitation.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvitation,
        email: 'different@example.com',
      })

      await expect(acceptTeamInvitation(token)).rejects.toThrow('This invitation is for a different email address')
    })
  })

  describe('declineTeamInvitation', () => {
    const token = 'valid-token-12345'
    const mockInvitation = {
      id: 'invitation-123',
      email: mockUser.email,
      status: InvitationStatus.PENDING,
    }

    it('should successfully decline invitation', async () => {
      ;(db.teamInvitation.findUnique as jest.Mock).mockResolvedValue(mockInvitation)

      const result = await declineTeamInvitation(token)

      expect(result.success).toBe(true)
      
      expect(db.teamInvitation.update).toHaveBeenCalledWith({
        where: { id: mockInvitation.id },
        data: {
          status: InvitationStatus.DECLINED,
          declinedAt: expect.any(Date),
        },
      })

      expect(logger.info).toHaveBeenCalledWith('Team invitation declined', {
        userId: mockUser.id,
        invitationId: mockInvitation.id,
      })
    })

    it('should throw error for invalid token', async () => {
      ;(db.teamInvitation.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(declineTeamInvitation('invalid-token')).rejects.toThrow('Invalid invitation token')
    })

    it('should throw error when email does not match', async () => {
      ;(db.teamInvitation.findUnique as jest.Mock).mockResolvedValue({
        ...mockInvitation,
        email: 'different@example.com',
      })

      await expect(declineTeamInvitation(token)).rejects.toThrow('This invitation is for a different email address')
    })
  })

  describe('updateTeamMemberRole', () => {
    const updateParams = {
      teamId: 'team-123',
      memberId: 'member-456',
      newRole: TeamRole.ADMIN,
    }

    beforeEach(() => {
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(TeamRole.OWNER)
      ;(canPerformAction as jest.Mock).mockReturnValue(true)
    })

    it('should successfully update member role', async () => {
      const targetMember = {
        id: updateParams.memberId,
        teamId: updateParams.teamId,
        userId: 'target-user',
        role: TeamRole.MEMBER,
        user: { id: 'target-user', name: 'Target User', email: 'target@example.com' },
      }

      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue(targetMember)
      ;(db.teamMember.update as jest.Mock).mockResolvedValue({
        ...targetMember,
        role: updateParams.newRole,
      })

      const result = await updateTeamMemberRole(updateParams)

      expect(result.success).toBe(true)
      expect(db.teamMember.update).toHaveBeenCalledWith({
        where: { id: updateParams.memberId },
        data: { role: updateParams.newRole },
      })

      expect(db.teamActivity.create).toHaveBeenCalledWith({
        data: {
          teamId: updateParams.teamId,
          userId: mockUser.id,
          action: TeamAction.MEMBER_ROLE_CHANGED,
          entityType: 'member',
          entityId: updateParams.memberId,
          entityName: targetMember.user.name,
          metadata: {
            oldRole: targetMember.role,
            newRole: updateParams.newRole,
          },
        },
      })
    })

    it('should throw error when user lacks permission', async () => {
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(TeamRole.MEMBER)
      ;(canPerformAction as jest.Mock).mockReturnValue(false)

      await expect(updateTeamMemberRole(updateParams)).rejects.toThrow('Insufficient permissions to change member roles')
    })

    it('should throw error when member not found', async () => {
      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(updateTeamMemberRole(updateParams)).rejects.toThrow('Member not found')
    })

    it('should prevent removing last owner', async () => {
      const ownerMember = {
        id: updateParams.memberId,
        teamId: updateParams.teamId,
        role: TeamRole.OWNER,
        user: { name: 'Owner User' },
      }

      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue(ownerMember)
      ;(db.teamMember.count as jest.Mock).mockResolvedValue(1)

      await expect(updateTeamMemberRole({
        ...updateParams,
        newRole: TeamRole.ADMIN,
      })).rejects.toThrow('Cannot change role of the only owner. Assign another owner first.')
    })

    it('should only allow owners to assign owner role', async () => {
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(TeamRole.ADMIN)
      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue({
        id: updateParams.memberId,
        teamId: updateParams.teamId,
        role: TeamRole.MEMBER,
        user: { name: 'Member' },
      })

      await expect(updateTeamMemberRole({
        ...updateParams,
        newRole: TeamRole.OWNER,
      })).rejects.toThrow('Only owners can assign the owner role')
    })
  })

  describe('removeTeamMember', () => {
    const removeParams = {
      teamId: 'team-123',
      memberId: 'member-456',
    }

    beforeEach(() => {
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(TeamRole.ADMIN)
      ;(canPerformAction as jest.Mock).mockReturnValue(true)
    })

    it('should successfully remove member', async () => {
      const targetMember = {
        id: removeParams.memberId,
        teamId: removeParams.teamId,
        userId: 'target-user',
        role: TeamRole.MEMBER,
        user: { id: 'target-user', name: 'Target User', email: 'target@example.com' },
      }

      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue(targetMember)

      const result = await removeTeamMember(removeParams)

      expect(result.success).toBe(true)
      expect(db.teamMember.delete).toHaveBeenCalledWith({
        where: { id: removeParams.memberId },
      })

      expect(db.teamActivity.create).toHaveBeenCalledWith({
        data: {
          teamId: removeParams.teamId,
          userId: mockUser.id,
          action: TeamAction.MEMBER_REMOVED,
          entityType: 'member',
          entityName: targetMember.user.name,
          metadata: {
            removedUserId: targetMember.userId,
            role: targetMember.role,
          },
        },
      })
    })

    it('should allow user to remove themselves', async () => {
      const selfMember = {
        id: removeParams.memberId,
        teamId: removeParams.teamId,
        userId: mockUser.id,
        role: TeamRole.MEMBER,
        user: mockUser,
      }

      ;(getUserTeamRole as jest.Mock).mockResolvedValue(TeamRole.MEMBER)
      ;(canPerformAction as jest.Mock).mockReturnValue(false)
      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue(selfMember)

      const result = await removeTeamMember(removeParams)

      expect(result.success).toBe(true)
      expect(db.teamActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: TeamAction.MEMBER_LEFT,
        }),
      })
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
    })

    it('should prevent removing last owner', async () => {
      const ownerMember = {
        id: removeParams.memberId,
        teamId: removeParams.teamId,
        role: TeamRole.OWNER,
        user: { name: 'Owner' },
      }

      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue(ownerMember)
      ;(db.teamMember.count as jest.Mock).mockResolvedValue(1)

      await expect(removeTeamMember(removeParams)).rejects.toThrow('Cannot remove the only owner of the team')
    })

    it('should throw error when member not found', async () => {
      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(removeTeamMember(removeParams)).rejects.toThrow('Member not found')
    })
  })

  describe('getTeamMembers', () => {
    it('should return team members when user is member', async () => {
      const members = [
        {
          id: 'member-1',
          teamId: 'team-123',
          role: TeamRole.OWNER,
          user: { id: 'user-1', name: 'Owner', email: 'owner@example.com' },
        },
        {
          id: 'member-2',
          teamId: 'team-123',
          role: TeamRole.MEMBER,
          user: { id: 'user-2', name: 'Member', email: 'member@example.com' },
        },
      ]

      ;(getUserTeamRole as jest.Mock).mockResolvedValue(TeamRole.MEMBER)
      ;(db.teamMember.findMany as jest.Mock).mockResolvedValue(members)

      const result = await getTeamMembers('team-123')

      expect(result).toEqual(members)
      expect(db.teamMember.findMany).toHaveBeenCalledWith({
        where: { teamId: 'team-123' },
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
          { role: 'desc' },
          { joinedAt: 'asc' },
        ],
      })
    })

    it('should throw error when user is not a member', async () => {
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(null)

      await expect(getTeamMembers('team-123')).rejects.toThrow('You are not a member of this team')
    })
  })

  describe('getTeamInvitations', () => {
    it('should return pending invitations for admins', async () => {
      const invitations = [
        {
          id: 'inv-1',
          teamId: 'team-123',
          email: 'invite1@example.com',
          status: InvitationStatus.PENDING,
          invitedBy: { id: 'user-1', name: 'Inviter', email: 'inviter@example.com' },
        },
        {
          id: 'inv-2',
          teamId: 'team-123',
          email: 'invite2@example.com',
          status: InvitationStatus.PENDING,
          invitedBy: { id: 'user-1', name: 'Inviter', email: 'inviter@example.com' },
        },
      ]

      ;(getUserTeamRole as jest.Mock).mockResolvedValue(TeamRole.ADMIN)
      ;(canPerformAction as jest.Mock).mockReturnValue(true)
      ;(db.teamInvitation.findMany as jest.Mock).mockResolvedValue(invitations)

      const result = await getTeamInvitations('team-123')

      expect(result).toEqual(invitations)
      expect(db.teamInvitation.findMany).toHaveBeenCalledWith({
        where: {
          teamId: 'team-123',
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
      })
    })

    it('should throw error for non-admin users', async () => {
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(TeamRole.MEMBER)
      ;(canPerformAction as jest.Mock).mockReturnValue(false)

      await expect(getTeamInvitations('team-123')).rejects.toThrow('Insufficient permissions to view invitations')
    })
  })
})