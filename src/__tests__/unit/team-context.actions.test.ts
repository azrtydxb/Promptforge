import {
  setTeamContext,
  getTeamContext,
  clearTeamContext,
  isInTeamContext,
  getCurrentContextType
} from '@/app/actions/team-context.actions'
import { getUserTeamRole } from '@/app/actions/team.actions'
import { requireAuth } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { TeamRole } from '@/generated/prisma'

// Mock dependencies
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

// Mock the cookies function
const mockCookieStore = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
}

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve(mockCookieStore)),
}))

// Mock the database dynamically imported in getTeamContext
jest.mock('@/lib/db', () => ({
  db: {
    team: {
      findUnique: jest.fn(),
    },
  },
}))

const TEAM_CONTEXT_COOKIE = 'promptforge_team_context'

describe('Team Context Actions', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' }
  const mockTeam = {
    id: 'team-123',
    slug: 'test-team',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(requireAuth as jest.Mock).mockResolvedValue(mockUser)
    // Reset environment
    process.env.NODE_ENV = 'test'
  })

  describe('setTeamContext', () => {
    it('should set team context when user is a member', async () => {
      const teamId = 'team-123'
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(TeamRole.MEMBER)

      const result = await setTeamContext(teamId)

      expect(result).toEqual({ success: true, teamId })
      expect(getUserTeamRole).toHaveBeenCalledWith(teamId)
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        TEAM_CONTEXT_COOKIE,
        teamId,
        {
          httpOnly: true,
          secure: false, // test environment
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 30,
        }
      )
      expect(logger.info).toHaveBeenCalledWith('Team context updated', {
        userId: mockUser.id,
        teamId,
      })
    })

    it('should set secure cookie in production', async () => {
      process.env.NODE_ENV = 'production'
      const teamId = 'team-123'
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(TeamRole.OWNER)

      await setTeamContext(teamId)

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        TEAM_CONTEXT_COOKIE,
        teamId,
        expect.objectContaining({
          secure: true,
        })
      )
    })

    it('should clear team context when teamId is null', async () => {
      const result = await setTeamContext(null)

      expect(result).toEqual({ success: true, teamId: null })
      expect(getUserTeamRole).not.toHaveBeenCalled()
      expect(mockCookieStore.delete).toHaveBeenCalledWith(TEAM_CONTEXT_COOKIE)
      expect(mockCookieStore.set).not.toHaveBeenCalled()
    })

    it('should throw error when user is not a team member', async () => {
      const teamId = 'team-123'
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(null)

      await expect(setTeamContext(teamId)).rejects.toThrow('You are not a member of this team')
      expect(mockCookieStore.set).not.toHaveBeenCalled()
    })

    it('should handle errors', async () => {
      const teamId = 'team-123'
      const error = new Error('Database error')
      ;(getUserTeamRole as jest.Mock).mockRejectedValue(error)

      await expect(setTeamContext(teamId)).rejects.toThrow(error)
      expect(logger.error).toHaveBeenCalledWith('Error setting team context', error)
    })
  })

  describe('getTeamContext', () => {
    it('should return team context when cookie exists and user is member', async () => {
      const teamId = 'team-123'
      mockCookieStore.get.mockReturnValue({ value: teamId })
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(TeamRole.ADMIN)
      
      // Mock the dynamic import of db
      const { db } = await import('@/lib/db')
      ;(db.team.findUnique as jest.Mock).mockResolvedValue(mockTeam)

      const result = await getTeamContext()

      expect(result).toEqual({
        teamId,
        teamSlug: mockTeam.slug,
      })
      expect(getUserTeamRole).toHaveBeenCalledWith(teamId)
      expect(db.team.findUnique).toHaveBeenCalledWith({
        where: { id: teamId },
        select: { slug: true },
      })
    })

    it('should return null context when no cookie exists', async () => {
      mockCookieStore.get.mockReturnValue(undefined)

      const result = await getTeamContext()

      expect(result).toEqual({
        teamId: null,
        teamSlug: null,
      })
      expect(getUserTeamRole).not.toHaveBeenCalled()
    })

    it('should clear context when user is no longer a member', async () => {
      const teamId = 'team-123'
      mockCookieStore.get.mockReturnValue({ value: teamId })
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(null)

      const result = await getTeamContext()

      expect(result).toEqual({
        teamId: null,
        teamSlug: null,
      })
      expect(mockCookieStore.delete).toHaveBeenCalledWith(TEAM_CONTEXT_COOKIE)
    })

    it('should handle team not found in database', async () => {
      const teamId = 'team-123'
      mockCookieStore.get.mockReturnValue({ value: teamId })
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(TeamRole.MEMBER)
      
      const { db } = await import('@/lib/db')
      ;(db.team.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await getTeamContext()

      expect(result).toEqual({
        teamId,
        teamSlug: null,
      })
    })

    it('should handle errors gracefully', async () => {
      const teamId = 'team-123'
      const error = new Error('Database error')
      mockCookieStore.get.mockReturnValue({ value: teamId })
      ;(requireAuth as jest.Mock).mockRejectedValue(error)

      const result = await getTeamContext()

      expect(result).toEqual({
        teamId: null,
        teamSlug: null,
      })
      expect(logger.error).toHaveBeenCalledWith('Error getting team context', error)
    })
  })

  describe('clearTeamContext', () => {
    it('should successfully clear team context', async () => {
      const result = await clearTeamContext()

      expect(result).toEqual({ success: true })
      expect(mockCookieStore.delete).toHaveBeenCalledWith(TEAM_CONTEXT_COOKIE)
      expect(logger.info).toHaveBeenCalledWith('Team context cleared')
    })

    it('should handle errors', async () => {
      const error = new Error('Cookie error')
      mockCookieStore.delete.mockImplementation(() => {
        throw error
      })

      await expect(clearTeamContext()).rejects.toThrow(error)
      expect(logger.error).toHaveBeenCalledWith('Error clearing team context', error)
    })
  })

  describe('isInTeamContext', () => {
    it('should return true when team context exists', async () => {
      const teamId = 'team-123'
      mockCookieStore.get.mockReturnValue({ value: teamId })
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(TeamRole.MEMBER)
      
      const { db } = await import('@/lib/db')
      ;(db.team.findUnique as jest.Mock).mockResolvedValue(mockTeam)

      const result = await isInTeamContext()

      expect(result).toBe(true)
    })

    it('should return false when no team context', async () => {
      mockCookieStore.get.mockReturnValue(undefined)

      const result = await isInTeamContext()

      expect(result).toBe(false)
    })

    it('should return false when user is no longer a member', async () => {
      const teamId = 'team-123'
      mockCookieStore.get.mockReturnValue({ value: teamId })
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(null)

      const result = await isInTeamContext()

      expect(result).toBe(false)
    })
  })

  describe('getCurrentContextType', () => {
    it('should return "team" when in team context', async () => {
      const teamId = 'team-123'
      mockCookieStore.get.mockReturnValue({ value: teamId })
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(TeamRole.VIEWER)
      
      const { db } = await import('@/lib/db')
      ;(db.team.findUnique as jest.Mock).mockResolvedValue(mockTeam)

      const result = await getCurrentContextType()

      expect(result).toBe('team')
    })

    it('should return "personal" when not in team context', async () => {
      mockCookieStore.get.mockReturnValue(undefined)

      const result = await getCurrentContextType()

      expect(result).toBe('personal')
    })

    it('should return "personal" when team context is invalid', async () => {
      const teamId = 'team-123'
      mockCookieStore.get.mockReturnValue({ value: teamId })
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(null)

      const result = await getCurrentContextType()

      expect(result).toBe('personal')
    })
  })
})