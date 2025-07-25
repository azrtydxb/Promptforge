import { 
  createTeam, 
  updateTeam, 
  deleteTeam, 
  getTeam, 
  getUserTeams,
  getUserTeamRole,
  canPerformAction
} from '@/app/actions/team.actions'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { TeamRole, TeamAction } from '@/generated/prisma'
import { revalidatePath } from 'next/cache'

// Mock dependencies
jest.mock('@/lib/db', () => ({
  db: {
    team: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    teamMember: {
      findUnique: jest.fn(),
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

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

describe('Team Actions', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' }
  const mockTeam = {
    id: 'team-123',
    name: 'Test Team',
    slug: 'test-team',
    description: 'A test team',
    logo: null,
    createdById: 'user-123',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    settings: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(requireAuth as jest.Mock).mockResolvedValue(mockUser)
  })

  describe('createTeam', () => {
    it('should create a new team with the user as owner', async () => {
      const params = {
        name: 'New Team',
        description: 'A new team for testing',
        logo: 'https://example.com/logo.png',
      }

      ;(db.team.findUnique as jest.Mock).mockResolvedValue(null)
      ;(db.team.create as jest.Mock).mockResolvedValue({
        ...mockTeam,
        ...params,
        slug: 'new-team',
        members: [{
          userId: mockUser.id,
          role: TeamRole.OWNER,
          user: mockUser,
        }],
      })

      const result = await createTeam(params)

      expect(result.success).toBe(true)
      expect(result.team).toBeDefined()
      expect(db.team.create).toHaveBeenCalledWith({
        data: {
          name: params.name,
          description: params.description,
          logo: params.logo,
          slug: 'new-team',
          createdById: mockUser.id,
          members: {
            create: {
              userId: mockUser.id,
              role: TeamRole.OWNER,
            },
          },
          activities: {
            create: {
              userId: mockUser.id,
              action: TeamAction.TEAM_CREATED,
              entityType: 'team',
              metadata: {
                teamName: params.name,
              },
            },
          },
        },
        include: {
          members: {
            include: {
              user: true,
            },
          },
        },
      })
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
      expect(revalidatePath).toHaveBeenCalledWith('/teams')
      expect(logger.info).toHaveBeenCalledWith('Team created', expect.any(Object))
    })

    it('should generate unique slug when name conflicts exist', async () => {
      const params = { name: 'Existing Team' }

      ;(db.team.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'existing-1' }) // First check: existing-team exists
        .mockResolvedValueOnce({ id: 'existing-2' }) // Second check: existing-team-1 exists
        .mockResolvedValueOnce(null) // Third check: existing-team-2 is available

      ;(db.team.create as jest.Mock).mockResolvedValue({
        ...mockTeam,
        name: params.name,
        slug: 'existing-team-2',
        members: [{
          userId: mockUser.id,
          role: TeamRole.OWNER,
          user: mockUser,
        }],
      })

      const result = await createTeam(params)

      expect(result.success).toBe(true)
      expect(db.team.findUnique).toHaveBeenCalledTimes(3)
      expect(db.team.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'existing-team-2',
          }),
        })
      )
    })

    it('should handle errors during team creation', async () => {
      const params = { name: 'Error Team' }
      const error = new Error('Database error')

      ;(db.team.findUnique as jest.Mock).mockResolvedValue(null)
      ;(db.team.create as jest.Mock).mockRejectedValue(error)

      await expect(createTeam(params)).rejects.toThrow('Failed to create team')
      expect(logger.error).toHaveBeenCalledWith('Error creating team', error)
    })

    it('should handle authentication failure', async () => {
      ;(requireAuth as jest.Mock).mockRejectedValue(new Error('Unauthorized'))

      await expect(createTeam({ name: 'Test' })).rejects.toThrow('Failed to create team')
    })
  })

  describe('updateTeam', () => {
    it('should update team when user is owner', async () => {
      const params = {
        teamId: 'team-123',
        name: 'Updated Team',
        description: 'Updated description',
        logo: 'https://example.com/new-logo.png',
        settings: { theme: 'dark' },
      }

      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue({
        userId: mockUser.id,
        teamId: params.teamId,
        role: TeamRole.OWNER,
      })

      ;(db.team.update as jest.Mock).mockResolvedValue({
        ...mockTeam,
        ...params,
      })

      const result = await updateTeam(params)

      expect(result.success).toBe(true)
      expect(db.team.update).toHaveBeenCalledWith({
        where: { id: params.teamId },
        data: {
          name: params.name,
          description: params.description,
          logo: params.logo,
          settings: params.settings,
        },
      })
      expect(db.teamActivity.create).toHaveBeenCalledWith({
        data: {
          teamId: params.teamId,
          userId: mockUser.id,
          action: TeamAction.TEAM_UPDATED,
          entityType: 'team',
          entityId: params.teamId,
          metadata: {
            changes: ['name', 'description', 'logo', 'settings'],
          },
        },
      })
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
      expect(revalidatePath).toHaveBeenCalledWith(`/teams/${mockTeam.slug}`)
    })

    it('should update team when user is admin', async () => {
      const params = {
        teamId: 'team-123',
        name: 'Admin Updated Team',
      }

      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue({
        userId: mockUser.id,
        teamId: params.teamId,
        role: TeamRole.ADMIN,
      })

      ;(db.team.update as jest.Mock).mockResolvedValue({
        ...mockTeam,
        name: params.name,
      })

      const result = await updateTeam(params)

      expect(result.success).toBe(true)
      expect(db.team.update).toHaveBeenCalled()
    })

    it('should throw error when user lacks permissions', async () => {
      const params = {
        teamId: 'team-123',
        name: 'Unauthorized Update',
      }

      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue({
        userId: mockUser.id,
        teamId: params.teamId,
        role: TeamRole.MEMBER,
      })

      await expect(updateTeam(params)).rejects.toThrow('Insufficient permissions to update team')
      expect(db.team.update).not.toHaveBeenCalled()
    })

    it('should throw error when user is not a member', async () => {
      const params = {
        teamId: 'team-123',
        name: 'Non-member Update',
      }

      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(updateTeam(params)).rejects.toThrow('Insufficient permissions to update team')
    })

    it('should handle partial updates', async () => {
      const params = {
        teamId: 'team-123',
        description: 'Only updating description',
      }

      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue({
        userId: mockUser.id,
        teamId: params.teamId,
        role: TeamRole.OWNER,
      })

      ;(db.team.update as jest.Mock).mockResolvedValue({
        ...mockTeam,
        description: params.description,
      })

      await updateTeam(params)

      expect(db.team.update).toHaveBeenCalledWith({
        where: { id: params.teamId },
        data: {
          description: params.description,
        },
      })
      expect(db.teamActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: {
            changes: ['description'],
          },
        }),
      })
    })
  })

  describe('deleteTeam', () => {
    it('should delete team when user is owner', async () => {
      const teamId = 'team-123'

      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue({
        userId: mockUser.id,
        teamId,
        role: TeamRole.OWNER,
      })

      ;(db.team.delete as jest.Mock).mockResolvedValue(mockTeam)

      const result = await deleteTeam(teamId)

      expect(result.success).toBe(true)
      expect(db.team.delete).toHaveBeenCalledWith({
        where: { id: teamId },
      })
      expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
      expect(revalidatePath).toHaveBeenCalledWith('/teams')
      expect(logger.info).toHaveBeenCalledWith('Team deleted', { teamId, userId: mockUser.id })
    })

    it('should throw error when user is not owner', async () => {
      const teamId = 'team-123'

      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue({
        userId: mockUser.id,
        teamId,
        role: TeamRole.ADMIN,
      })

      await expect(deleteTeam(teamId)).rejects.toThrow('Only team owners can delete teams')
      expect(db.team.delete).not.toHaveBeenCalled()
    })

    it('should throw error when user is not a member', async () => {
      const teamId = 'team-123'

      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(deleteTeam(teamId)).rejects.toThrow('Only team owners can delete teams')
    })
  })

  describe('getTeam', () => {
    const mockTeamWithDetails = {
      ...mockTeam,
      members: [
        {
          userId: mockUser.id,
          teamId: mockTeam.id,
          role: TeamRole.OWNER,
          user: mockUser,
        },
      ],
      _count: {
        prompts: 10,
        folders: 5,
        tags: 15,
      },
    }

    it('should get team by ID when user is a member', async () => {
      ;(db.team.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockTeamWithDetails) // Found by ID

      const result = await getTeam('team-123')

      expect(result).toEqual(mockTeamWithDetails)
      expect(db.team.findUnique).toHaveBeenCalledWith({
        where: { id: 'team-123' },
        include: {
          members: {
            include: {
              user: true,
            },
          },
          _count: {
            select: {
              prompts: true,
              folders: true,
              tags: true,
            },
          },
        },
      })
    })

    it('should get team by slug when ID lookup fails', async () => {
      ;(db.team.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // Not found by ID
        .mockResolvedValueOnce(mockTeamWithDetails) // Found by slug

      const result = await getTeam('test-team')

      expect(result).toEqual(mockTeamWithDetails)
      expect(db.team.findUnique).toHaveBeenCalledTimes(2)
      expect(db.team.findUnique).toHaveBeenLastCalledWith({
        where: { slug: 'test-team' },
        include: expect.any(Object),
      })
    })

    it('should throw error when team not found', async () => {
      ;(db.team.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(getTeam('nonexistent')).rejects.toThrow('Team not found')
    })

    it('should throw error when user is not a member', async () => {
      const teamWithoutUser = {
        ...mockTeam,
        members: [
          {
            userId: 'other-user',
            teamId: mockTeam.id,
            role: TeamRole.OWNER,
            user: { id: 'other-user', email: 'other@example.com' },
          },
        ],
        _count: {
          prompts: 0,
          folders: 0,
          tags: 0,
        },
      }

      ;(db.team.findUnique as jest.Mock).mockResolvedValue(teamWithoutUser)

      await expect(getTeam('team-123')).rejects.toThrow('You are not a member of this team')
    })
  })

  describe('getUserTeams', () => {
    it('should return all active teams for the user', async () => {
      const mockTeams = [
        {
          ...mockTeam,
          id: 'team-1',
          name: 'Team 1',
          members: [{ userId: mockUser.id, role: TeamRole.OWNER }],
          _count: { members: 3, prompts: 10 },
        },
        {
          ...mockTeam,
          id: 'team-2',
          name: 'Team 2',
          members: [{ userId: mockUser.id, role: TeamRole.MEMBER }],
          _count: { members: 5, prompts: 20 },
        },
      ]

      ;(db.team.findMany as jest.Mock).mockResolvedValue(mockTeams)

      const result = await getUserTeams()

      expect(result).toEqual(mockTeams)
      expect(db.team.findMany).toHaveBeenCalledWith({
        where: {
          members: {
            some: {
              userId: mockUser.id,
            },
          },
          isActive: true,
        },
        include: {
          members: {
            where: {
              userId: mockUser.id,
            },
          },
          _count: {
            select: {
              members: true,
              prompts: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    })

    it('should return empty array when user has no teams', async () => {
      ;(db.team.findMany as jest.Mock).mockResolvedValue([])

      const result = await getUserTeams()

      expect(result).toEqual([])
    })

    it('should handle database errors', async () => {
      const error = new Error('Database error')
      ;(db.team.findMany as jest.Mock).mockRejectedValue(error)

      await expect(getUserTeams()).rejects.toThrow(error)
      expect(logger.error).toHaveBeenCalledWith('Error getting user teams', error)
    })
  })

  describe('getUserTeamRole', () => {
    it('should return user role in team', async () => {
      const teamId = 'team-123'

      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue({
        userId: mockUser.id,
        teamId,
        role: TeamRole.ADMIN,
      })

      const result = await getUserTeamRole(teamId)

      expect(result).toBe(TeamRole.ADMIN)
      expect(db.teamMember.findUnique).toHaveBeenCalledWith({
        where: {
          teamId_userId: {
            teamId,
            userId: mockUser.id,
          },
        },
      })
    })

    it('should return role for specific user when userId provided', async () => {
      const teamId = 'team-123'
      const targetUserId = 'other-user-456'

      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue({
        userId: targetUserId,
        teamId,
        role: TeamRole.MEMBER,
      })

      const result = await getUserTeamRole(teamId, targetUserId)

      expect(result).toBe(TeamRole.MEMBER)
      expect(db.teamMember.findUnique).toHaveBeenCalledWith({
        where: {
          teamId_userId: {
            teamId,
            userId: targetUserId,
          },
        },
      })
    })

    it('should return null when user is not a member', async () => {
      ;(db.teamMember.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await getUserTeamRole('team-123')

      expect(result).toBeNull()
    })

    it('should return null on error', async () => {
      const error = new Error('Database error')
      ;(db.teamMember.findUnique as jest.Mock).mockRejectedValue(error)

      const result = await getUserTeamRole('team-123')

      expect(result).toBeNull()
      expect(logger.error).toHaveBeenCalledWith('Error getting user team role', error)
    })
  })

  describe('canPerformAction', () => {
    it('should correctly check role hierarchy', () => {
      // Owner can perform all actions
      expect(canPerformAction(TeamRole.OWNER, TeamRole.OWNER)).toBe(true)
      expect(canPerformAction(TeamRole.OWNER, TeamRole.ADMIN)).toBe(true)
      expect(canPerformAction(TeamRole.OWNER, TeamRole.MEMBER)).toBe(true)
      expect(canPerformAction(TeamRole.OWNER, TeamRole.VIEWER)).toBe(true)

      // Admin can perform admin and below actions
      expect(canPerformAction(TeamRole.ADMIN, TeamRole.OWNER)).toBe(false)
      expect(canPerformAction(TeamRole.ADMIN, TeamRole.ADMIN)).toBe(true)
      expect(canPerformAction(TeamRole.ADMIN, TeamRole.MEMBER)).toBe(true)
      expect(canPerformAction(TeamRole.ADMIN, TeamRole.VIEWER)).toBe(true)

      // Member can perform member and viewer actions
      expect(canPerformAction(TeamRole.MEMBER, TeamRole.OWNER)).toBe(false)
      expect(canPerformAction(TeamRole.MEMBER, TeamRole.ADMIN)).toBe(false)
      expect(canPerformAction(TeamRole.MEMBER, TeamRole.MEMBER)).toBe(true)
      expect(canPerformAction(TeamRole.MEMBER, TeamRole.VIEWER)).toBe(true)

      // Viewer can only perform viewer actions
      expect(canPerformAction(TeamRole.VIEWER, TeamRole.OWNER)).toBe(false)
      expect(canPerformAction(TeamRole.VIEWER, TeamRole.ADMIN)).toBe(false)
      expect(canPerformAction(TeamRole.VIEWER, TeamRole.MEMBER)).toBe(false)
      expect(canPerformAction(TeamRole.VIEWER, TeamRole.VIEWER)).toBe(true)
    })

    it('should return false for null role', () => {
      expect(canPerformAction(null, TeamRole.VIEWER)).toBe(false)
      expect(canPerformAction(null, TeamRole.OWNER)).toBe(false)
    })
  })
})