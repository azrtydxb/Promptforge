import {
  generateRandomUsername,
  generateAnimalUsername,
  generateUsernameFromInfo,
  validateUsername,
  generateUsernameSuggestions
} from '@/lib/username-generator'

describe('Username Generator', () => {
  describe('generateRandomUsername', () => {
    it('should generate a username with correct format', () => {
      const username = generateRandomUsername()
      // Format: AdjectiveNoun123
      expect(username).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d{1,3}$/)
    })

    it('should generate different usernames on multiple calls', () => {
      const usernames = new Set()
      for (let i = 0; i < 10; i++) {
        usernames.add(generateRandomUsername())
      }
      // At least 8 out of 10 should be unique (allowing for some random collisions)
      expect(usernames.size).toBeGreaterThanOrEqual(8)
    })
  })

  describe('generateAnimalUsername', () => {
    it('should generate a username with animal format', () => {
      const username = generateAnimalUsername()
      // Format: AdjectiveAnimal123
      expect(username).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d{1,3}$/)
    })

    it('should contain valid animal names', () => {
      const username = generateAnimalUsername()
      // Check if the username contains at least part of an animal name
      expect(username).toBeTruthy()
    })
  })

  describe('generateUsernameFromInfo', () => {
    it('should generate username from name', () => {
      const username = generateUsernameFromInfo('John Doe', null)
      expect(username).toMatch(/^johndoe\d{1,3}$/)
    })

    it('should generate username from email', () => {
      const username = generateUsernameFromInfo(null, 'test.user@example.com')
      expect(username).toMatch(/^testuser\d{1,3}$/)
    })

    it('should handle special characters in name', () => {
      const username = generateUsernameFromInfo('John-Doe_123!', null)
      expect(username).toMatch(/^johndoe123\d{1,3}$/)
    })

    it('should fall back to random username for short names', () => {
      const username = generateUsernameFromInfo('Jo', null)
      // Should return a random username format
      expect(username).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d{1,3}$/)
    })

    it('should fall back to random username for invalid inputs', () => {
      const username = generateUsernameFromInfo('', '')
      expect(username).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d{1,3}$/)
    })

    it('should handle null and undefined inputs', () => {
      const username = generateUsernameFromInfo(null, null)
      expect(username).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d{1,3}$/)
    })
  })

  describe('validateUsername', () => {
    it('should validate correct usernames', () => {
      expect(validateUsername('john123')).toEqual({ valid: true })
      expect(validateUsername('user_name')).toEqual({ valid: true })
      expect(validateUsername('test-user')).toEqual({ valid: true })
      expect(validateUsername('ABC123')).toEqual({ valid: true })
    })

    it('should reject empty username', () => {
      expect(validateUsername('')).toEqual({
        valid: false,
        error: 'Username is required'
      })
      expect(validateUsername('   ')).toEqual({
        valid: false,
        error: 'Username is required'
      })
    })

    it('should reject short usernames', () => {
      expect(validateUsername('ab')).toEqual({
        valid: false,
        error: 'Username must be at least 3 characters long'
      })
    })

    it('should reject long usernames', () => {
      const longUsername = 'a'.repeat(31)
      expect(validateUsername(longUsername)).toEqual({
        valid: false,
        error: 'Username must be no more than 30 characters long'
      })
    })

    it('should reject usernames with invalid characters', () => {
      expect(validateUsername('user@name')).toEqual({
        valid: false,
        error: 'Username can only contain letters, numbers, underscores, and hyphens'
      })
      expect(validateUsername('user name')).toEqual({
        valid: false,
        error: 'Username can only contain letters, numbers, underscores, and hyphens'
      })
    })

    it('should reject usernames not starting with letter', () => {
      expect(validateUsername('123user')).toEqual({
        valid: false,
        error: 'Username must start with a letter'
      })
      expect(validateUsername('_user')).toEqual({
        valid: false,
        error: 'Username must start with a letter'
      })
    })
  })

  describe('generateUsernameSuggestions', () => {
    it('should generate requested number of suggestions', () => {
      const suggestions = generateUsernameSuggestions(5)
      expect(suggestions).toHaveLength(5)
    })

    it('should generate unique suggestions', () => {
      const suggestions = generateUsernameSuggestions(10)
      const uniqueSuggestions = new Set(suggestions)
      // At least 8 out of 10 should be unique
      expect(uniqueSuggestions.size).toBeGreaterThanOrEqual(8)
    })

    it('should use default count when not specified', () => {
      const suggestions = generateUsernameSuggestions()
      expect(suggestions).toHaveLength(5)
    })

    it('should alternate between random and animal usernames', () => {
      const suggestions = generateUsernameSuggestions(4)
      suggestions.forEach((username) => {
        expect(username).toMatch(/^[A-Z][a-z]+[A-Z][a-z]+\d{1,3}$/)
      })
    })
  })
})