import {
  getTeamActivity,
  getTeamActivitySummary
} from '@/app/actions/team-activity.actions'
import { getUserTeamRole } from '@/app/actions/team.actions'
import { formatActivityMessage } from '@/lib/team-activity-formatter'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { TeamRole, TeamAction } from '@/generated/prisma'

// Mock dependencies
jest.mock('@/lib/db', () => ({
  db: {
    team: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    teamActivity: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
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

jest.mock('@/app/actions/team.actions', () => ({
  getUserTeamRole: jest.fn(),
}))

describe('Team Activity Actions', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com', name: 'Test User' }
  const mockTeam = {
    id: 'team-123',
    name: 'Test Team',
    slug: 'test-team',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(requireAuth as jest.Mock).mockResolvedValue(mockUser)
    ;(getUserTeamRole as jest.Mock).mockResolvedValue(TeamRole.MEMBER)
    ;(db.team.findUnique as jest.Mock).mockResolvedValue(mockTeam)
  })

  describe('getTeamActivity', () => {
    const mockActivities = [
      {
        id: 'activity-1',
        teamId: 'team-123',
        userId: 'user-123',
        action: TeamAction.PROMPT_CREATED,
        entityType: 'prompt',
        entityId: 'prompt-1',
        entityName: 'Test Prompt',
        metadata: {},
        createdAt: new Date('2024-01-01'),
        user: {
          id: 'user-123',
          name: 'Test User',
          username: 'testuser',
          image: null,
        },
      },
      {
        id: 'activity-2',
        teamId: 'team-123',
        userId: 'user-456',
        action: TeamAction.MEMBER_JOINED,
        entityType: 'member',
        entityId: 'member-2',
        metadata: { role: TeamRole.MEMBER },
        createdAt: new Date('2024-01-02'),
        user: {
          id: 'user-456',
          name: 'Another User',
          username: 'anotheruser',
          image: null,
        },
      },
    ]

    it('should return team activities with pagination info', async () => {
      const params = {
        teamId: 'team-123',
        limit: 10,
        offset: 0,
      }

      ;(db.teamActivity.findMany as jest.Mock).mockResolvedValue(mockActivities)
      ;(db.teamActivity.count as jest.Mock).mockResolvedValue(25)

      const result = await getTeamActivity(params)

      expect(result).toEqual({
        activities: mockActivities,
        total: 25,
        hasMore: true,
      })

      expect(db.teamActivity.findMany).toHaveBeenCalledWith({
        where: { teamId: params.teamId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: params.limit,
        skip: params.offset,
      })

      expect(db.teamActivity.count).toHaveBeenCalledWith({
        where: { teamId: params.teamId },
      })
    })

    it('should filter by action type', async () => {
      const params = {
        teamId: 'team-123',
        action: TeamAction.PROMPT_CREATED,
      }

      ;(db.teamActivity.findMany as jest.Mock).mockResolvedValue([mockActivities[0]])
      ;(db.teamActivity.count as jest.Mock).mockResolvedValue(1)

      await getTeamActivity(params)

      expect(db.teamActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            teamId: params.teamId,
            action: params.action,
          },
        })
      )
    })

    it('should filter by user', async () => {
      const params = {
        teamId: 'team-123',
        userId: 'user-123',
      }

      ;(db.teamActivity.findMany as jest.Mock).mockResolvedValue([mockActivities[0]])
      ;(db.teamActivity.count as jest.Mock).mockResolvedValue(1)

      await getTeamActivity(params)

      expect(db.teamActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            teamId: params.teamId,
            userId: params.userId,
          },
        })
      )
    })

    it('should filter by entity type', async () => {
      const params = {
        teamId: 'team-123',
        entityType: 'prompt',
      }

      ;(db.teamActivity.findMany as jest.Mock).mockResolvedValue([mockActivities[0]])
      ;(db.teamActivity.count as jest.Mock).mockResolvedValue(1)

      await getTeamActivity(params)

      expect(db.teamActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            teamId: params.teamId,
            entityType: params.entityType,
          },
        })
      )
    })

    it('should use default limit when not provided', async () => {
      const params = { teamId: 'team-123' }

      ;(db.teamActivity.findMany as jest.Mock).mockResolvedValue(mockActivities)
      ;(db.teamActivity.count as jest.Mock).mockResolvedValue(2)

      await getTeamActivity(params)

      expect(db.teamActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        })
      )
    })

    it('should throw error when user is not a team member', async () => {
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(null)

      await expect(getTeamActivity({ teamId: 'team-123' }))
        .rejects.toThrow('You are not a member of this team')
    })

    it('should handle errors', async () => {
      const error = new Error('Database error')
      ;(db.teamActivity.findMany as jest.Mock).mockRejectedValue(error)

      await expect(getTeamActivity({ teamId: 'team-123' }))
        .rejects.toThrow(error)

      expect(logger.error).toHaveBeenCalledWith('Error getting team activity', error)
    })

    it('should calculate hasMore correctly', async () => {
      const params = {
        teamId: 'team-123',
        limit: 2,
        offset: 23,
      }

      ;(db.teamActivity.findMany as jest.Mock).mockResolvedValue(mockActivities)
      ;(db.teamActivity.count as jest.Mock).mockResolvedValue(25)

      const result = await getTeamActivity(params)

      expect(result.hasMore).toBe(false) // 23 + 2 = 25, no more items
    })
  })

  describe('getTeamActivitySummary', () => {
    beforeEach(() => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      jest.spyOn(Date, 'now').mockImplementation(() => new Date('2024-01-31').getTime())
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should return activity summary for team by ID', async () => {
      const activityCounts = [
        { action: TeamAction.PROMPT_CREATED, _count: 15 },
        { action: TeamAction.MEMBER_JOINED, _count: 3 },
      ]

      const activeUsers = [
        { userId: 'user-123', _count: 20 },
        { userId: 'user-456', _count: 10 },
      ]

      const users = [
        { id: 'user-123', name: 'User 1', username: 'user1', image: null },
        { id: 'user-456', name: 'User 2', username: 'user2', image: null },
      ]

      const recentActivity = [
        { id: 'activity-1', action: TeamAction.PROMPT_CREATED, user: users[0] },
        { id: 'activity-2', action: TeamAction.MEMBER_JOINED, user: users[1] },
      ]

      ;(db.team.findUnique as jest.Mock).mockResolvedValue(mockTeam)
      ;(db.teamActivity.groupBy as jest.Mock)
        .mockResolvedValueOnce(activityCounts)
        .mockResolvedValueOnce(activeUsers)
      ;(db.user.findMany as jest.Mock).mockResolvedValue(users)
      ;(db.teamActivity.findMany as jest.Mock).mockResolvedValue(recentActivity)

      const result = await getTeamActivitySummary('team-123')

      expect(result).toEqual({
        activityCounts: {
          [TeamAction.PROMPT_CREATED]: 15,
          [TeamAction.MEMBER_JOINED]: 3,
        },
        activeUsers: [
          { user: users[0], activityCount: 20 },
          { user: users[1], activityCount: 10 },
        ],
        recentActivity,
      })

      expect(db.teamActivity.groupBy).toHaveBeenCalledTimes(2)
      expect(db.teamActivity.groupBy).toHaveBeenCalledWith({
        by: ['action'],
        where: {
          teamId: mockTeam.id,
          createdAt: {
            gte: expect.any(Date),
          },
        },
        _count: true,
      })
    })

    it('should work with team id', async () => {
      ;(db.team.findUnique as jest.Mock).mockResolvedValue(mockTeam)
      ;(db.teamActivity.groupBy as jest.Mock).mockResolvedValue([])
      ;(db.user.findMany as jest.Mock).mockResolvedValue([])
      ;(db.teamActivity.findMany as jest.Mock).mockResolvedValue([])

      await getTeamActivitySummary('team-123')

      expect(db.team.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'team-123'
        }
      })
    })

    it('should throw error when team not found', async () => {
      ;(db.team.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(getTeamActivitySummary('nonexistent'))
        .rejects.toThrow('Team not found')
    })

    it('should throw error when user is not a member', async () => {
      ;(db.team.findUnique as jest.Mock).mockResolvedValue(mockTeam)
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(null)

      await expect(getTeamActivitySummary('team-123'))
        .rejects.toThrow('You are not a member of this team')
    })

    it('should handle empty activity data', async () => {
      ;(db.team.findUnique as jest.Mock).mockResolvedValue(mockTeam)
      ;(db.teamActivity.groupBy as jest.Mock).mockResolvedValue([])
      ;(db.user.findMany as jest.Mock).mockResolvedValue([])
      ;(db.teamActivity.findMany as jest.Mock).mockResolvedValue([])

      const result = await getTeamActivitySummary('team-123')

      expect(result).toEqual({
        activityCounts: {},
        activeUsers: [],
        recentActivity: [],
      })
    })

    it('should handle errors', async () => {
      const error = new Error('Database error')
      ;(db.team.findUnique as jest.Mock).mockRejectedValue(error)

      await expect(getTeamActivitySummary('team-123'))
        .rejects.toThrow(error)

      expect(logger.error).toHaveBeenCalledWith('Error getting team activity summary', error)
    })
  })

  describe('formatActivityMessage', () => {
    const baseActivity = {
      id: 'activity-1',
      user: { name: 'John Doe', username: 'johndoe' },
    }

    it('should format team created message', () => {
      const activity = {
        ...baseActivity,
        action: TeamAction.TEAM_CREATED,
      }

      expect(formatActivityMessage(activity)).toBe('John Doe created the team')
    })

    it('should format member invited message', () => {
      const activity = {
        ...baseActivity,
        action: TeamAction.MEMBER_INVITED,
        metadata: { email: 'newuser@example.com' },
      }

      expect(formatActivityMessage(activity)).toBe('John Doe invited newuser@example.com to join')
    })

    it('should format member role changed message', () => {
      const activity = {
        ...baseActivity,
        action: TeamAction.MEMBER_ROLE_CHANGED,
        entityName: 'Jane Smith',
        metadata: { newRole: TeamRole.ADMIN },
      }

      expect(formatActivityMessage(activity)).toBe('John Doe changed Jane Smith\'s role to ADMIN')
    })

    it('should format prompt created message', () => {
      const activity = {
        ...baseActivity,
        action: TeamAction.PROMPT_CREATED,
        entityName: 'API Documentation Template',
      }

      expect(formatActivityMessage(activity)).toBe('John Doe created prompt "API Documentation Template"')
    })

    it('should use username when name is not available', () => {
      const activity = {
        ...baseActivity,
        action: TeamAction.TEAM_UPDATED,
        user: { username: 'johndoe' },
      }

      expect(formatActivityMessage(activity)).toBe('johndoe updated team settings')
    })

    it('should use "Someone" when no user info available', () => {
      const activity = {
        action: TeamAction.MEMBER_LEFT,
        user: undefined,
      }

      expect(formatActivityMessage(activity)).toBe('Someone left the team')
    })

    it('should handle all action types', () => {
      const actions = [
        { action: TeamAction.TEAM_UPDATED, expected: 'updated team settings' },
        { action: TeamAction.MEMBER_JOINED, expected: 'joined the team' },
        { action: TeamAction.MEMBER_LEFT, expected: 'left the team' },
        { action: TeamAction.MEMBER_REMOVED, entityName: 'User', expected: 'removed User from the team' },
        { action: TeamAction.PROMPT_UPDATED, entityName: 'Prompt', expected: 'updated prompt "Prompt"' },
        { action: TeamAction.PROMPT_DELETED, entityName: 'Prompt', expected: 'deleted prompt "Prompt"' },
        { action: TeamAction.PROMPT_ARCHIVED, entityName: 'Prompt', expected: 'archived prompt "Prompt"' },
        { action: TeamAction.PROMPT_RESTORED, entityName: 'Prompt', expected: 'restored prompt "Prompt"' },
        { action: TeamAction.FOLDER_CREATED, entityName: 'Folder', expected: 'created folder "Folder"' },
        { action: TeamAction.FOLDER_UPDATED, entityName: 'Folder', expected: 'updated folder "Folder"' },
        { action: TeamAction.FOLDER_DELETED, entityName: 'Folder', expected: 'deleted folder "Folder"' },
        { action: TeamAction.TAG_CREATED, entityName: 'Tag', expected: 'created tag "Tag"' },
        { action: TeamAction.TAG_UPDATED, entityName: 'Tag', expected: 'updated tag "Tag"' },
        { action: TeamAction.TAG_DELETED, entityName: 'Tag', expected: 'deleted tag "Tag"' },
      ]

      actions.forEach(({ action, expected, entityName }) => {
        const activity = {
          ...baseActivity,
          action,
          entityName,
        }
        expect(formatActivityMessage(activity)).toContain(expected)
      })
    })

    it('should handle unknown action', () => {
      const activity = {
        ...baseActivity,
        action: 'UNKNOWN_ACTION' as unknown as TeamAction,
      }

      expect(formatActivityMessage(activity)).toBe('John Doe performed an action')
    })
  })
})