import { searchTags } from '@/app/actions/tag.actions'
import { db } from '@/lib/db'

// Mock the database module
jest.mock('@/lib/db', () => ({
  db: {
    tag: {
      findMany: jest.fn(),
    },
    prompt: {
      update: jest.fn(),
    },
  },
}))

// Mock the auth module
jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn().mockResolvedValue({ id: 'test-user-id' }),
}))

// Mock Next.js cache functions
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

describe('Tag Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('searchTags', () => {
    it('should search tags with case-insensitive query', async () => {
      const mockTags = [
        { id: '1', name: 'React' },
        { id: '2', name: 'react-native' },
        { id: '3', name: 'reactive' },
      ]

      ;(db.tag.findMany as jest.Mock).mockResolvedValue(mockTags)

      const results = await searchTags('react')

      expect(db.tag.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'react',
            mode: 'insensitive',
          },
        },
      })

      expect(results).toEqual(mockTags)
    })

    it('should return empty array when no tags match', async () => {
      ;(db.tag.findMany as jest.Mock).mockResolvedValue([])

      const results = await searchTags('nonexistent')

      expect(db.tag.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'nonexistent',
            mode: 'insensitive',
          },
        },
      })

      expect(results).toEqual([])
    })

    it('should handle empty query string', async () => {
      const mockTags = [
        { id: '1', name: 'JavaScript' },
        { id: '2', name: 'TypeScript' },
      ]

      ;(db.tag.findMany as jest.Mock).mockResolvedValue(mockTags)

      const results = await searchTags('')

      expect(db.tag.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: '',
            mode: 'insensitive',
          },
        },
      })

      expect(results).toEqual(mockTags)
    })

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed')
      ;(db.tag.findMany as jest.Mock).mockRejectedValue(dbError)

      await expect(searchTags('test')).rejects.toThrow('Database connection failed')
    })
  })
})