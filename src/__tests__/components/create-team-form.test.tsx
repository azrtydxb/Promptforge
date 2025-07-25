import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateTeamForm } from '@/components/teams/create-team-form'
import { createTeam } from '@/app/actions/team.actions'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}))

jest.mock('@/app/actions/team.actions', () => ({
  createTeam: jest.fn(),
}))

describe('CreateTeamForm Component', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  }

  const mockToast = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useToast as jest.Mock).mockReturnValue({ toast: mockToast })
  })

  describe('Form Rendering', () => {
    it('should render form fields correctly', () => {
      render(<CreateTeamForm />)

      // Check form fields
      expect(screen.getByLabelText('Team Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Description (optional)')).toBeInTheDocument()
      
      // Check placeholders
      expect(screen.getByPlaceholderText('My Awesome Team')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('What is this team about?')).toBeInTheDocument()
      
      // Check buttons
      expect(screen.getByRole('button', { name: 'Create Team' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      
      // Check descriptions
      expect(screen.getByText("This is your team's display name.")).toBeInTheDocument()
      expect(screen.getByText("Brief description of your team's purpose.")).toBeInTheDocument()
    })

    it('should have empty initial values', () => {
      render(<CreateTeamForm />)

      const nameInput = screen.getByLabelText('Team Name') as HTMLInputElement
      const descriptionInput = screen.getByLabelText('Description (optional)') as HTMLTextAreaElement

      expect(nameInput.value).toBe('')
      expect(descriptionInput.value).toBe('')
    })
  })

  describe('Form Validation', () => {
    it('should show error when team name is too short', async () => {
      const user = userEvent.setup()
      render(<CreateTeamForm />)

      const nameInput = screen.getByLabelText('Team Name')
      const submitButton = screen.getByRole('button', { name: 'Create Team' })

      // Type a short name
      await user.type(nameInput, 'A')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Team name must be at least 2 characters.')).toBeInTheDocument()
      })
    })

    it('should show error when team name is too long', async () => {
      const user = userEvent.setup()
      render(<CreateTeamForm />)

      const nameInput = screen.getByLabelText('Team Name')
      const submitButton = screen.getByRole('button', { name: 'Create Team' })

      // Type a very long name (more than 50 characters)
      const longName = 'A'.repeat(51)
      await user.type(nameInput, longName)
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Team name must be less than 50 characters.')).toBeInTheDocument()
      })
    })

    it('should show error when description is too long', async () => {
      const user = userEvent.setup()
      render(<CreateTeamForm />)

      const nameInput = screen.getByLabelText('Team Name')
      const descriptionInput = screen.getByLabelText('Description (optional)')
      const submitButton = screen.getByRole('button', { name: 'Create Team' })

      // Fill valid name but long description
      await user.type(nameInput, 'Valid Team Name')
      await user.type(descriptionInput, 'A'.repeat(201))
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Description must be less than 200 characters.')).toBeInTheDocument()
      })
    })

    it('should not show errors for valid input', async () => {
      const user = userEvent.setup()
      ;(createTeam as jest.Mock).mockResolvedValue({
        success: true,
        team: { id: 'team-123', slug: 'valid-team' },
      })

      render(<CreateTeamForm />)

      const nameInput = screen.getByLabelText('Team Name')
      const descriptionInput = screen.getByLabelText('Description (optional)')
      const submitButton = screen.getByRole('button', { name: 'Create Team' })

      await user.type(nameInput, 'Valid Team Name')
      await user.type(descriptionInput, 'This is a valid description')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText(/must be at least/)).not.toBeInTheDocument()
        expect(screen.queryByText(/must be less than/)).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('should successfully create team and redirect', async () => {
      const user = userEvent.setup()
      const mockTeam = {
        id: 'team-123',
        name: 'New Team',
        slug: 'new-team',
      }

      ;(createTeam as jest.Mock).mockResolvedValue({
        success: true,
        team: mockTeam,
      })

      render(<CreateTeamForm />)

      const nameInput = screen.getByLabelText('Team Name')
      const descriptionInput = screen.getByLabelText('Description (optional)')
      const submitButton = screen.getByRole('button', { name: 'Create Team' })

      await user.type(nameInput, 'New Team')
      await user.type(descriptionInput, 'Team description')
      await user.click(submitButton)

      await waitFor(() => {
        expect(createTeam).toHaveBeenCalledWith({
          name: 'New Team',
          description: 'Team description',
        })

        expect(mockToast).toHaveBeenCalledWith({
          title: 'Team created!',
          description: 'Your new team has been created successfully.',
        })

        expect(mockRouter.push).toHaveBeenCalledWith('/teams/new-team')
      })
    })

    it('should handle submission errors', async () => {
      const user = userEvent.setup()
      const error = new Error('Team name already exists')
      ;(createTeam as jest.Mock).mockRejectedValue(error)

      render(<CreateTeamForm />)

      const nameInput = screen.getByLabelText('Team Name')
      const submitButton = screen.getByRole('button', { name: 'Create Team' })

      await user.type(nameInput, 'Existing Team')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Team name already exists',
          variant: 'destructive',
        })
      })
    })

    it('should show generic error message for non-Error exceptions', async () => {
      const user = userEvent.setup()
      ;(createTeam as jest.Mock).mockRejectedValue('Unknown error')

      render(<CreateTeamForm />)

      const nameInput = screen.getByLabelText('Team Name')
      const submitButton = screen.getByRole('button', { name: 'Create Team' })

      await user.type(nameInput, 'Test Team')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to create team',
          variant: 'destructive',
        })
      })
    })

    it('should disable form during submission', async () => {
      const user = userEvent.setup()
      let resolveCreateTeam: (value: { success: boolean; team: { id: string; slug: string } }) => void
      const createTeamPromise = new Promise((resolve) => {
        resolveCreateTeam = resolve
      })
      ;(createTeam as jest.Mock).mockReturnValue(createTeamPromise)

      render(<CreateTeamForm />)

      const nameInput = screen.getByLabelText('Team Name')
      const descriptionInput = screen.getByLabelText('Description (optional)')
      const submitButton = screen.getByRole('button', { name: 'Create Team' })
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })

      await user.type(nameInput, 'Test Team')
      await user.click(submitButton)

      // Check that form elements are disabled during submission
      expect(nameInput).toBeDisabled()
      expect(descriptionInput).toBeDisabled()
      expect(submitButton).toBeDisabled()
      expect(cancelButton).toBeDisabled()

      // Check loading spinner
      expect(screen.getByRole('button', { name: 'Create Team' }).querySelector('.animate-spin')).toBeInTheDocument()

      // Resolve the promise
      resolveCreateTeam!({
        success: true,
        team: { id: 'team-123', slug: 'test-team' },
      })

      await waitFor(() => {
        expect(nameInput).not.toBeDisabled()
        expect(descriptionInput).not.toBeDisabled()
        expect(submitButton).not.toBeDisabled()
        expect(cancelButton).not.toBeDisabled()
      })
    })
  })

  describe('Cancel Button', () => {
    it('should navigate back when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<CreateTeamForm />)

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)

      expect(mockRouter.back).toHaveBeenCalled()
    })

    it('should not submit form when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<CreateTeamForm />)

      const nameInput = screen.getByLabelText('Team Name')
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })

      await user.type(nameInput, 'Test Team')
      await user.click(cancelButton)

      expect(createTeam).not.toHaveBeenCalled()
      expect(mockRouter.back).toHaveBeenCalled()
    })
  })

  describe('Optional Fields', () => {
    it('should submit without description', async () => {
      const user = userEvent.setup()
      ;(createTeam as jest.Mock).mockResolvedValue({
        success: true,
        team: { id: 'team-123', slug: 'test-team' },
      })

      render(<CreateTeamForm />)

      const nameInput = screen.getByLabelText('Team Name')
      const submitButton = screen.getByRole('button', { name: 'Create Team' })

      // Only fill in name, leave description empty
      await user.type(nameInput, 'Test Team')
      await user.click(submitButton)

      await waitFor(() => {
        expect(createTeam).toHaveBeenCalledWith({
          name: 'Test Team',
          description: '', // Empty string is the default value
        })
      })
    })
  })
})