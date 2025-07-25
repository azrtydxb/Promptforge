import {
  inviteTeamMember,
  acceptTeamInvitation,
  declineTeamInvitation
} from '@/app/actions/team-members.actions'
import { createTeam } from '@/app/actions/team.actions'
import { setTeamContext, getTeamContext } from '@/app/actions/team-context.actions'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { sendTeamInvitationEmail } from '@/lib/email'
import { TeamRole, InvitationStatus } from '@/generated/prisma'

// Mock dependencies
jest.mock('@/lib/db', () => ({
  db: {
    $transaction: jest.fn(),
    user: {
      findUnique: jest.fn(),
    },
    team: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    teamMember: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    teamInvitation: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
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

jest.mock('@/lib/email', () => ({
  sendTeamInvitationEmail: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'test-invitation-token'),
  })),
}))

// Mock cookies for context tests
const mockCookieStore = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
}

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve(mockCookieStore)),
}))

describe('Team Invitation Flow Integration Tests', () => {
  const teamOwner = { id: 'owner-123', email: 'owner@example.com', name: 'Team Owner' }
  const invitedUser = { id: 'invited-123', email: 'invited@example.com', name: 'Invited User' }
  const mockTeam = {
    id: 'team-123',
    name: 'Test Team',
    slug: 'test-team',
    createdById: teamOwner.id,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Setup transaction mock to execute the callback
    ;(db.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback(db)
    })
  })

  describe('Complete Invitation Flow', () => {
    it('should complete full invitation flow: create team -> invite member -> accept invitation', async () => {
      // Step 1: Team Owner creates a team
      ;(requireAuth as jest.Mock).mockResolvedValue(teamOwner)
      ;(db.team.findUnique as jest.Mock).mockResolvedValue(null) // No slug conflicts
      ;(db.team.create as jest.Mock).mockResolvedValue({
        ...mockTeam,
        members: [{
          userId: teamOwner.id,
          role: TeamRole.OWNER,
          user: teamOwner,
        }],
      })

      const createResult = await createTeam({
        name: 'Test Team',
        description: 'A team for testing invitations',
      })

      expect(createResult.success).toBe(true)
      expect(createResult.team).toBeDefined()

      // Step 2: Team Owner invites a new member
      const mockInvitation = {
        id: 'invitation-123',
        teamId: mockTeam.id,
        email: invitedUser.email,
        role: TeamRole.MEMBER,
        invitedById: teamOwner.id,
        token: 'test-invitation-token',
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        team: mockTeam,
        invitedBy: teamOwner,
      }

      // Mock permission checks
      ;(db.teamMember.findUnique as jest.Mock)
        .mockResolvedValueOnce({ // getUserTeamRole check
          userId: teamOwner.id,
          teamId: mockTeam.id,
          role: TeamRole.OWNER,
        })
        .mockResolvedValueOnce(null) // Check if invited user is already a member

      ;(db.user.findUnique as jest.Mock).mockResolvedValue(null) // Invited user doesn't exist yet
      ;(db.teamInvitation.findFirst as jest.Mock).mockResolvedValue(null) // No existing invitation
      ;(db.teamInvitation.create as jest.Mock).mockResolvedValue(mockInvitation)

      const inviteResult = await inviteTeamMember({
        teamId: mockTeam.id,
        email: invitedUser.email,
        role: TeamRole.MEMBER,
      })

      expect(inviteResult.success).toBe(true)
      expect(inviteResult.invitation).toEqual(mockInvitation)
      expect(sendTeamInvitationEmail).toHaveBeenCalledWith({
        to: invitedUser.email,
        teamName: mockTeam.name,
        inviterName: teamOwner.name,
        invitationUrl: expect.stringContaining('test-invitation-token'),
        role: TeamRole.MEMBER,
      })

      // Step 3: Invited user accepts the invitation
      ;(requireAuth as jest.Mock).mockResolvedValue(invitedUser)
      ;(db.teamInvitation.findUnique as jest.Mock).mockResolvedValue(mockInvitation)
      ;(db.teamMember.create as jest.Mock).mockResolvedValue({
        id: 'member-123',
        teamId: mockTeam.id,
        userId: invitedUser.id,
        role: TeamRole.MEMBER,
      })

      const acceptResult = await acceptTeamInvitation('test-invitation-token')

      expect(acceptResult.success).toBe(true)
      expect(acceptResult.team).toEqual(mockTeam)

      // Verify invitation was accepted
      expect(db.teamInvitation.update).toHaveBeenCalledWith({
        where: { id: mockInvitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: expect.any(Date),
        },
      })

      // Verify member was added
      expect(db.teamMember.create).toHaveBeenCalledWith({
        data: {
          teamId: mockTeam.id,
          userId: invitedUser.id,
          role: TeamRole.MEMBER,
        },
      })

      // Verify activity was logged
      expect(db.teamActivity.create).toHaveBeenCalledTimes(3) // Team created, member invited, member joined
    })

    it('should handle invitation decline flow', async () => {
      const mockInvitation = {
        id: 'invitation-123',
        teamId: mockTeam.id,
        email: invitedUser.email,
        role: TeamRole.MEMBER,
        status: InvitationStatus.PENDING,
        token: 'test-invitation-token',
      }

      ;(requireAuth as jest.Mock).mockResolvedValue(invitedUser)
      ;(db.teamInvitation.findUnique as jest.Mock).mockResolvedValue(mockInvitation)

      const declineResult = await declineTeamInvitation('test-invitation-token')

      expect(declineResult.success).toBe(true)
      expect(db.teamInvitation.update).toHaveBeenCalledWith({
        where: { id: mockInvitation.id },
        data: {
          status: InvitationStatus.DECLINED,
          declinedAt: expect.any(Date),
        },
      })
      expect(db.teamMember.create).not.toHaveBeenCalled()
    })
  })

  describe('Context Switching After Joining Team', () => {
    it('should allow user to switch context after joining team', async () => {
      // User accepts invitation and joins team
      const mockInvitation = {
        id: 'invitation-123',
        teamId: mockTeam.id,
        email: invitedUser.email,
        role: TeamRole.MEMBER,
        status: InvitationStatus.PENDING,
        token: 'test-invitation-token',
        team: mockTeam,
      }

      ;(requireAuth as jest.Mock).mockResolvedValue(invitedUser)
      ;(db.teamInvitation.findUnique as jest.Mock).mockResolvedValue(mockInvitation)
      ;(db.teamMember.create as jest.Mock).mockResolvedValue({
        id: 'member-123',
        teamId: mockTeam.id,
        userId: invitedUser.id,
        role: TeamRole.MEMBER,
      })

      await acceptTeamInvitation('test-invitation-token')

      // Now test context switching
      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue({
        userId: invitedUser.id,
        teamId: mockTeam.id,
        role: TeamRole.MEMBER,
      })

      const contextResult = await setTeamContext(mockTeam.id)

      expect(contextResult.success).toBe(true)
      expect(contextResult.teamId).toBe(mockTeam.id)
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'promptforge_team_context',
        mockTeam.id,
        expect.any(Object)
      )

      // Verify context can be retrieved
      mockCookieStore.get.mockReturnValue({ value: mockTeam.id })
      ;(db.team.findUnique as jest.Mock).mockResolvedValue(mockTeam)

      const context = await getTeamContext()

      expect(context.teamId).toBe(mockTeam.id)
      expect(context.teamSlug).toBe(mockTeam.slug)
    })
  })

  describe('Permission Enforcement After Invitation', () => {
    it('should enforce role-based permissions after joining', async () => {
      // Setup: User has joined team as MEMBER
      ;(requireAuth as jest.Mock).mockResolvedValue(invitedUser)
      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue({
        userId: invitedUser.id,
        teamId: mockTeam.id,
        role: TeamRole.MEMBER,
      })

      // Test 1: Member cannot invite others (requires ADMIN)
      await expect(inviteTeamMember({
        teamId: mockTeam.id,
        email: 'another@example.com',
        role: TeamRole.MEMBER,
      })).rejects.toThrow('Insufficient permissions to invite members')

      // Test 2: Member can create prompts
      // Test would need to import and mock team-prompts.actions to test fully
      // const { createTeamPrompt } = await import('@/app/actions/team-prompts.actions')
      
      // Mock the canPerformAction to return true for MEMBER role
      jest.doMock('@/app/actions/team.actions', () => ({
        getUserTeamRole: jest.fn().mockResolvedValue(TeamRole.MEMBER),
        canPerformAction: jest.fn((userRole, requiredRole) => {
          const roleHierarchy = {
            [TeamRole.OWNER]: 4,
            [TeamRole.ADMIN]: 3,
            [TeamRole.MEMBER]: 2,
            [TeamRole.VIEWER]: 1,
          }
          return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
        }),
      }))

      // This should succeed as MEMBER can create prompts
      // (Would need to mock db.teamPrompt.create to test fully)
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle expired invitations', async () => {
      const expiredInvitation = {
        id: 'invitation-123',
        teamId: mockTeam.id,
        email: invitedUser.email,
        status: InvitationStatus.PENDING,
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
        team: mockTeam,
      }

      ;(requireAuth as jest.Mock).mockResolvedValue(invitedUser)
      ;(db.teamInvitation.findUnique as jest.Mock).mockResolvedValue(expiredInvitation)

      await expect(acceptTeamInvitation('expired-token'))
        .rejects.toThrow('This invitation has expired')

      expect(db.teamInvitation.update).toHaveBeenCalledWith({
        where: { id: expiredInvitation.id },
        data: { status: InvitationStatus.EXPIRED },
      })
    })

    it('should prevent duplicate invitations', async () => {
      ;(requireAuth as jest.Mock).mockResolvedValue(teamOwner)
      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue({
        userId: teamOwner.id,
        teamId: mockTeam.id,
        role: TeamRole.OWNER,
      })
      ;(db.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(db.teamInvitation.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-invitation',
        email: invitedUser.email,
        status: InvitationStatus.PENDING,
      })

      await expect(inviteTeamMember({
        teamId: mockTeam.id,
        email: invitedUser.email,
      })).rejects.toThrow('An invitation has already been sent to this email')
    })

    it('should prevent inviting existing members', async () => {
      ;(requireAuth as jest.Mock).mockResolvedValue(teamOwner)
      ;(db.teamMember.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          userId: teamOwner.id,
          teamId: mockTeam.id,
          role: TeamRole.OWNER,
        })
        .mockResolvedValueOnce({
          userId: invitedUser.id,
          teamId: mockTeam.id,
          role: TeamRole.MEMBER,
        })
      ;(db.user.findUnique as jest.Mock).mockResolvedValue(invitedUser)

      await expect(inviteTeamMember({
        teamId: mockTeam.id,
        email: invitedUser.email,
      })).rejects.toThrow('User is already a member of this team')
    })

    it('should handle email mismatch on acceptance', async () => {
      const mockInvitation = {
        id: 'invitation-123',
        email: 'different@example.com',
        status: InvitationStatus.PENDING,
        token: 'test-token',
      }

      ;(requireAuth as jest.Mock).mockResolvedValue(invitedUser)
      ;(db.teamInvitation.findUnique as jest.Mock).mockResolvedValue(mockInvitation)

      await expect(acceptTeamInvitation('test-token'))
        .rejects.toThrow('This invitation is for a different email address')
    })
  })

  describe('Rollback Scenarios', () => {
    it('should handle email service failure gracefully', async () => {
      ;(requireAuth as jest.Mock).mockResolvedValue(teamOwner)
      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue({
        userId: teamOwner.id,
        teamId: mockTeam.id,
        role: TeamRole.OWNER,
      })
      ;(db.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(db.teamInvitation.findFirst as jest.Mock).mockResolvedValue(null)
      ;(db.teamInvitation.create as jest.Mock).mockResolvedValue({
        id: 'invitation-123',
        team: mockTeam,
        invitedBy: teamOwner,
      })
      ;(sendTeamInvitationEmail as jest.Mock).mockRejectedValue(
        new Error('Email service unavailable')
      )

      await expect(inviteTeamMember({
        teamId: mockTeam.id,
        email: 'test@example.com',
      })).rejects.toThrow('Email service unavailable')

      // In a real scenario with transactions, the invitation would be rolled back
      // Here we just verify the error is propagated correctly
    })
  })
})