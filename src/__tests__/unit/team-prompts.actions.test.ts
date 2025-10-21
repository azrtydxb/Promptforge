import {
  createTeamPrompt,
  updateTeamPrompt,
  deleteTeamPrompt,
  archiveTeamPrompt,
  getTeamPrompts,
  getTeamPrompt,
  pinTeamPrompt,
  copyTeamPromptToPersonal
} from '@/app/actions/team-prompts.actions'
import { getUserTeamRole, canPerformAction } from '@/app/actions/team.actions'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { TeamRole, TeamAction } from '@/generated/prisma'
import { revalidatePath } from 'next/cache'

// Mock dependencies
jest.mock('@/lib/db', () => ({
  db: {
    teamPrompt: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    teamFolder: {
      findUnique: jest.fn(),
    },
    teamActivity: {
      create: jest.fn(),
    },
    prompt: {
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

jest.mock('@/app/actions/team.actions', () => ({
  getUserTeamRole: jest.fn(),
  canPerformAction: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

describe('Team Prompts Actions', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com', name: 'Test User' }
  const mockTeam = { id: 'team-123', name: 'Test Team' }
  const mockPrompt = {
    id: 'prompt-123',
    teamId: 'team-123',
    title: 'Test Prompt',
    description: 'A test prompt',
    content: 'Prompt content here',
    createdById: 'user-123',
    folderId: null,
    isArchived: false,
    pinnedAt: null,
    viewCount: 0,
    copyCount: 0,
    lastUsedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(requireAuth as jest.Mock).mockResolvedValue(mockUser)
    ;(getUserTeamRole as jest.Mock).mockResolvedValue(TeamRole.MEMBER)
    ;(canPerformAction as jest.Mock).mockReturnValue(true)
  })

  describe('createTeamPrompt', () => {
    const createParams = {
      teamId: 'team-123',
      title: 'New Prompt',
      description: 'New prompt description',
      content: 'New prompt content',
      folderId: 'folder-123',
      tagIds: ['tag-1', 'tag-2'],
    }

    it('should successfully create a team prompt', async () => {
      const mockFolder = { id: 'folder-123', teamId: 'team-123' }
      const mockCreatedPrompt = {
        ...mockPrompt,
        ...createParams,
        createdBy: mockUser,
        folder: mockFolder,
        tags: [{ id: 'tag-1' }, { id: 'tag-2' }],
      }

      ;(db.teamFolder.findUnique as jest.Mock).mockResolvedValue(mockFolder)
      ;(db.teamPrompt.create as jest.Mock).mockResolvedValue(mockCreatedPrompt)

      const result = await createTeamPrompt(createParams)

      expect(result.success).toBe(true)
      expect(result.prompt).toEqual(mockCreatedPrompt)

      expect(db.teamPrompt.create).toHaveBeenCalledWith({
        data: {
          teamId: createParams.teamId,
          title: createParams.title,
          description: createParams.description,
          content: createParams.content,
          createdById: mockUser.id,
          folderId: createParams.folderId,
          tags: {
            connect: [{ id: 'tag-1' }, { id: 'tag-2' }],
          },
        },
        include: {
          createdBy: true,
          folder: true,
          tags: true,
        },
      })

      expect(db.teamActivity.create).toHaveBeenCalledWith({
        data: {
          teamId: createParams.teamId,
          userId: mockUser.id,
          action: TeamAction.PROMPT_CREATED,
          entityType: 'prompt',
          entityId: mockCreatedPrompt.id,
          entityName: mockCreatedPrompt.title,
        },
      })

      expect(revalidatePath).toHaveBeenCalledWith(`/teams/${createParams.teamId}/prompts`)
    })

    it('should create prompt without folder and tags', async () => {
      const simpleParams = {
        teamId: 'team-123',
        title: 'Simple Prompt',
      }

      ;(db.teamPrompt.create as jest.Mock).mockResolvedValue({
        ...mockPrompt,
        ...simpleParams,
      })

      await createTeamPrompt(simpleParams)

      expect(db.teamPrompt.create).toHaveBeenCalledWith({
        data: {
          teamId: simpleParams.teamId,
          title: simpleParams.title,
          description: undefined,
          content: undefined,
          createdById: mockUser.id,
          folderId: undefined,
          tags: undefined,
        },
        include: expect.any(Object),
      })
    })

    it('should throw error when user lacks permission', async () => {
      ;(canPerformAction as jest.Mock).mockReturnValue(false)

      await expect(createTeamPrompt(createParams)).rejects.toThrow('Insufficient permissions to create prompts')
    })

    it('should throw error when folder belongs to different team', async () => {
      ;(db.teamFolder.findUnique as jest.Mock).mockResolvedValue({
        id: 'folder-123',
        teamId: 'different-team',
      })

      await expect(createTeamPrompt(createParams)).rejects.toThrow('Invalid folder')
    })

    it('should throw error when folder not found', async () => {
      ;(db.teamFolder.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(createTeamPrompt(createParams)).rejects.toThrow('Invalid folder')
    })
  })

  describe('updateTeamPrompt', () => {
    const updateParams = {
      promptId: 'prompt-123',
      title: 'Updated Title',
      description: 'Updated description',
      content: 'Updated content',
      folderId: 'new-folder-123',
      tagIds: ['tag-3', 'tag-4'],
    }

    it('should successfully update prompt as creator', async () => {
      const mockFolder = { id: 'new-folder-123', teamId: 'team-123' }
      const updatedPrompt = {
        ...mockPrompt,
        ...updateParams,
        team: mockTeam,
        createdBy: mockUser,
        folder: mockFolder,
        tags: [{ id: 'tag-3' }, { id: 'tag-4' }],
      }

      ;(db.teamPrompt.findUnique as jest.Mock).mockResolvedValue({
        ...mockPrompt,
        team: mockTeam,
      })
      ;(db.teamFolder.findUnique as jest.Mock).mockResolvedValue(mockFolder)
      ;(db.teamPrompt.update as jest.Mock).mockResolvedValue(updatedPrompt)

      const result = await updateTeamPrompt(updateParams)

      expect(result.success).toBe(true)
      expect(result.prompt).toEqual(updatedPrompt)

      expect(db.teamPrompt.update).toHaveBeenCalledWith({
        where: { id: updateParams.promptId },
        data: {
          title: updateParams.title,
          description: updateParams.description,
          content: updateParams.content,
          folderId: updateParams.folderId,
          tags: {
            set: [{ id: 'tag-3' }, { id: 'tag-4' }],
          },
        },
        include: {
          createdBy: true,
          folder: true,
          tags: true,
        },
      })

      expect(db.teamActivity.create).toHaveBeenCalledWith({
        data: {
          teamId: mockPrompt.teamId,
          userId: mockUser.id,
          action: TeamAction.PROMPT_UPDATED,
          entityType: 'prompt',
          entityId: mockPrompt.id,
          entityName: updatedPrompt.title,
        },
      })
    })

    it('should allow admin to update any prompt', async () => {
      const otherUserPrompt = {
        ...mockPrompt,
        createdById: 'other-user',
        team: mockTeam,
      }

      ;(db.teamPrompt.findUnique as jest.Mock).mockResolvedValue(otherUserPrompt)
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(TeamRole.ADMIN)
      ;(canPerformAction as jest.Mock).mockReturnValue(true)
      ;(db.teamPrompt.update as jest.Mock).mockResolvedValue(otherUserPrompt)

      await updateTeamPrompt({ promptId: 'prompt-123', title: 'Admin Update' })

      expect(db.teamPrompt.update).toHaveBeenCalled()
    })

    it('should clear folder when null is provided', async () => {
      ;(db.teamPrompt.findUnique as jest.Mock).mockResolvedValue({
        ...mockPrompt,
        team: mockTeam,
      })
      ;(db.teamPrompt.update as jest.Mock).mockResolvedValue(mockPrompt)

      await updateTeamPrompt({ promptId: 'prompt-123', folderId: null })

      expect(db.teamPrompt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            folderId: null,
          }),
        })
      )
    })

    it('should throw error when prompt not found', async () => {
      ;(db.teamPrompt.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(updateTeamPrompt(updateParams)).rejects.toThrow('Prompt not found')
    })

    it('should throw error when non-creator without admin rights tries to update', async () => {
      ;(db.teamPrompt.findUnique as jest.Mock).mockResolvedValue({
        ...mockPrompt,
        createdById: 'other-user',
        team: mockTeam,
      })
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(TeamRole.MEMBER)
      ;(canPerformAction as jest.Mock).mockReturnValue(false)

      await expect(updateTeamPrompt(updateParams)).rejects.toThrow('Insufficient permissions to update this prompt')
    })
  })

  describe('deleteTeamPrompt', () => {
    it('should successfully delete prompt as creator', async () => {
      ;(db.teamPrompt.findUnique as jest.Mock).mockResolvedValue(mockPrompt)

      const result = await deleteTeamPrompt('prompt-123')

      expect(result.success).toBe(true)
      expect(db.teamPrompt.delete).toHaveBeenCalledWith({
        where: { id: 'prompt-123' },
      })

      expect(db.teamActivity.create).toHaveBeenCalledWith({
        data: {
          teamId: mockPrompt.teamId,
          userId: mockUser.id,
          action: TeamAction.PROMPT_DELETED,
          entityType: 'prompt',
          entityName: mockPrompt.title,
        },
      })
    })

    it('should allow admin to delete any prompt', async () => {
      ;(db.teamPrompt.findUnique as jest.Mock).mockResolvedValue({
        ...mockPrompt,
        createdById: 'other-user',
      })
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(TeamRole.ADMIN)
      ;(canPerformAction as jest.Mock).mockReturnValue(true)

      await deleteTeamPrompt('prompt-123')

      expect(db.teamPrompt.delete).toHaveBeenCalled()
    })

    it('should throw error when prompt not found', async () => {
      ;(db.teamPrompt.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(deleteTeamPrompt('prompt-123')).rejects.toThrow('Prompt not found')
    })

    it('should throw error when user lacks permission', async () => {
      ;(db.teamPrompt.findUnique as jest.Mock).mockResolvedValue({
        ...mockPrompt,
        createdById: 'other-user',
      })
      ;(canPerformAction as jest.Mock).mockReturnValue(false)

      await expect(deleteTeamPrompt('prompt-123')).rejects.toThrow('Insufficient permissions to delete this prompt')
    })
  })

  describe('archiveTeamPrompt', () => {
    it('should archive unarchived prompt', async () => {
      ;(db.teamPrompt.findUnique as jest.Mock).mockResolvedValue(mockPrompt)
      ;(db.teamPrompt.update as jest.Mock).mockResolvedValue({
        ...mockPrompt,
        isArchived: true,
      })

      const result = await archiveTeamPrompt('prompt-123')

      expect(result.success).toBe(true)
      expect(result.prompt.isArchived).toBe(true)

      expect(db.teamPrompt.update).toHaveBeenCalledWith({
        where: { id: 'prompt-123' },
        data: { isArchived: true },
      })

      expect(db.teamActivity.create).toHaveBeenCalledWith({
        data: {
          teamId: mockPrompt.teamId,
          userId: mockUser.id,
          action: TeamAction.PROMPT_ARCHIVED,
          entityType: 'prompt',
          entityId: mockPrompt.id,
          entityName: mockPrompt.title,
        },
      })
    })

    it('should restore archived prompt', async () => {
      const archivedPrompt = { ...mockPrompt, isArchived: true }
      ;(db.teamPrompt.findUnique as jest.Mock).mockResolvedValue(archivedPrompt)
      ;(db.teamPrompt.update as jest.Mock).mockResolvedValue({
        ...archivedPrompt,
        isArchived: false,
      })

      const result = await archiveTeamPrompt('prompt-123')

      expect(result.prompt.isArchived).toBe(false)
      expect(db.teamActivity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: TeamAction.PROMPT_RESTORED,
        }),
      })
    })
  })

  describe('getTeamPrompts', () => {
    const mockPrompts = [
      {
        ...mockPrompt,
        id: 'prompt-1',
        title: 'Prompt 1',
        pinnedAt: new Date(),
        _count: { versions: 3 },
      },
      {
        ...mockPrompt,
        id: 'prompt-2',
        title: 'Prompt 2',
        pinnedAt: null,
        _count: { versions: 1 },
      },
    ]

    it('should return team prompts with default filters', async () => {
      ;(db.teamPrompt.findMany as jest.Mock).mockResolvedValue(mockPrompts)

      const result = await getTeamPrompts({ teamId: 'team-123' })

      expect(result).toEqual(mockPrompts)
      expect(db.teamPrompt.findMany).toHaveBeenCalledWith({
        where: {
          teamId: 'team-123',
          isArchived: false,
        },
        include: expect.any(Object),
        orderBy: [
          { pinnedAt: 'desc' },
          { lastUsedAt: 'desc' },
          { updatedAt: 'desc' },
        ],
      })
    })

    it('should include archived prompts when requested', async () => {
      ;(db.teamPrompt.findMany as jest.Mock).mockResolvedValue(mockPrompts)

      await getTeamPrompts({ teamId: 'team-123', includeArchived: true })

      expect(db.teamPrompt.findMany).toHaveBeenCalledWith({
        where: {
          teamId: 'team-123',
        },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      })
    })

    it('should filter by folder', async () => {
      ;(db.teamPrompt.findMany as jest.Mock).mockResolvedValue([])

      await getTeamPrompts({ teamId: 'team-123', folderId: 'folder-123' })

      expect(db.teamPrompt.findMany).toHaveBeenCalledWith({
        where: {
          teamId: 'team-123',
          isArchived: false,
          folderId: 'folder-123',
        },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      })
    })

    it('should filter by tags', async () => {
      ;(db.teamPrompt.findMany as jest.Mock).mockResolvedValue([])

      await getTeamPrompts({ teamId: 'team-123', tagIds: ['tag-1', 'tag-2'] })

      expect(db.teamPrompt.findMany).toHaveBeenCalledWith({
        where: {
          teamId: 'team-123',
          isArchived: false,
          tags: {
            some: {
              id: { in: ['tag-1', 'tag-2'] },
            },
          },
        },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      })
    })

    it('should throw error when user is not a team member', async () => {
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(null)

      await expect(getTeamPrompts({ teamId: 'team-123' }))
        .rejects.toThrow('You are not a member of this team')
    })
  })

  describe('getTeamPrompt', () => {
    const fullPrompt = {
      ...mockPrompt,
      team: mockTeam,
      createdBy: mockUser,
      folder: null,
      tags: [],
      versions: [],
    }

    it('should return prompt details and update usage stats', async () => {
      ;(db.teamPrompt.findUnique as jest.Mock).mockResolvedValue(fullPrompt)

      const result = await getTeamPrompt('prompt-123')

      expect(result).toEqual(fullPrompt)
      expect(db.teamPrompt.update).toHaveBeenCalledWith({
        where: { id: 'prompt-123' },
        data: {
          viewCount: { increment: 1 },
          lastUsedAt: expect.any(Date),
        },
      })
    })

    it('should throw error when prompt not found', async () => {
      ;(db.teamPrompt.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(getTeamPrompt('prompt-123')).rejects.toThrow('Prompt not found')
    })

    it('should throw error when user is not a team member', async () => {
      ;(db.teamPrompt.findUnique as jest.Mock).mockResolvedValue(fullPrompt)
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(null)

      await expect(getTeamPrompt('prompt-123'))
        .rejects.toThrow('You are not a member of this team')
    })
  })

  describe('pinTeamPrompt', () => {
    it('should pin unpinned prompt', async () => {
      ;(db.teamPrompt.findUnique as jest.Mock).mockResolvedValue(mockPrompt)
      ;(db.teamPrompt.update as jest.Mock).mockResolvedValue({
        ...mockPrompt,
        pinnedAt: new Date(),
      })

      const result = await pinTeamPrompt('prompt-123')

      expect(result.success).toBe(true)
      expect(result.prompt.pinnedAt).toBeTruthy()
      expect(db.teamPrompt.update).toHaveBeenCalledWith({
        where: { id: 'prompt-123' },
        data: { pinnedAt: expect.any(Date) },
      })
    })

    it('should unpin pinned prompt', async () => {
      const pinnedPrompt = { ...mockPrompt, pinnedAt: new Date() }
      ;(db.teamPrompt.findUnique as jest.Mock).mockResolvedValue(pinnedPrompt)
      ;(db.teamPrompt.update as jest.Mock).mockResolvedValue({
        ...pinnedPrompt,
        pinnedAt: null,
      })

      const result = await pinTeamPrompt('prompt-123')

      expect(result.prompt.pinnedAt).toBeNull()
      expect(db.teamPrompt.update).toHaveBeenCalledWith({
        where: { id: 'prompt-123' },
        data: { pinnedAt: null },
      })
    })

    it('should throw error when user lacks permission', async () => {
      ;(db.teamPrompt.findUnique as jest.Mock).mockResolvedValue(mockPrompt)
      ;(canPerformAction as jest.Mock).mockReturnValue(false)

      await expect(pinTeamPrompt('prompt-123')).rejects.toThrow('Insufficient permissions')
    })
  })

  describe('copyTeamPromptToPersonal', () => {
    const teamPromptWithDetails = {
      ...mockPrompt,
      tags: [{ id: 'tag-1' }, { id: 'tag-2' }],
      enhancedContent: 'Enhanced content',
      enhancementSuggestions: { suggestions: [] },
      autoTags: ['auto-tag-1'],
    }

    it('should successfully copy team prompt to personal library', async () => {
      const personalPrompt = {
        id: 'personal-prompt-123',
        userId: mockUser.id,
        title: teamPromptWithDetails.title,
      }

      ;(db.teamPrompt.findUnique as jest.Mock).mockResolvedValue(teamPromptWithDetails)
      ;(db.prompt.create as jest.Mock).mockResolvedValue(personalPrompt)

      const result = await copyTeamPromptToPersonal('prompt-123')

      expect(result.success).toBe(true)
      expect(result.prompt).toEqual(personalPrompt)

      expect(db.prompt.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          title: teamPromptWithDetails.title,
          description: teamPromptWithDetails.description,
          content: teamPromptWithDetails.content,
        },
      })

      expect(db.teamPrompt.update).toHaveBeenCalledWith({
        where: { id: 'prompt-123' },
        data: { copyCount: { increment: 1 } },
      })
    })

    it('should throw error when prompt not found', async () => {
      ;(db.teamPrompt.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(copyTeamPromptToPersonal('prompt-123'))
        .rejects.toThrow('Prompt not found')
    })

    it('should throw error when user is not a team member', async () => {
      ;(db.teamPrompt.findUnique as jest.Mock).mockResolvedValue(teamPromptWithDetails)
      ;(getUserTeamRole as jest.Mock).mockResolvedValue(null)

      await expect(copyTeamPromptToPersonal('prompt-123'))
        .rejects.toThrow('You are not a member of this team')
    })
  })
})