import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TeamSwitcher } from '@/components/teams/team-switcher'
import { getUserTeams } from '@/app/actions/team.actions'
import { getTeamContext, setTeamContext } from '@/app/actions/team-context.actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { TeamRole } from '@/generated/prisma'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('@/app/actions/team.actions', () => ({
  getUserTeams: jest.fn(),
}))

jest.mock('@/app/actions/team-context.actions', () => ({
  getTeamContext: jest.fn(),
  setTeamContext: jest.fn(),
}))

describe('TeamSwitcher Component', () => {
  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  }

  const mockTeams = [
    {
      id: 'team-1',
      name: 'Engineering Team',
      slug: 'engineering-team',
      logo: null,
      members: [{ role: TeamRole.OWNER }],
      _count: { members: 5, prompts: 20 },
    },
    {
      id: 'team-2',
      name: 'Marketing Team',
      slug: 'marketing-team',
      logo: 'https://example.com/logo.png',
      members: [{ role: TeamRole.MEMBER }],
      _count: { members: 3, prompts: 15 },
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  describe('Initial Rendering', () => {
    it('should show loading state initially', () => {
      ;(getUserTeams as jest.Mock).mockImplementation(() => new Promise(() => {}))
      ;(getTeamContext as jest.Mock).mockImplementation(() => new Promise(() => {}))

      render(<TeamSwitcher />)

      // Check for loading skeleton
      const loadingElement = screen.getByRole('button').parentElement
      expect(loadingElement).toHaveClass('animate-pulse')
    })

    it('should display personal workspace when no team is selected', async () => {
      ;(getUserTeams as jest.Mock).mockResolvedValue(mockTeams)
      ;(getTeamContext as jest.Mock).mockResolvedValue({ teamId: null, teamSlug: null })

      render(<TeamSwitcher />)

      await waitFor(() => {
        expect(screen.getByText('Personal Workspace')).toBeInTheDocument()
      })
    })

    it('should display current team when team is selected', async () => {
      ;(getUserTeams as jest.Mock).mockResolvedValue(mockTeams)
      ;(getTeamContext as jest.Mock).mockResolvedValue({ 
        teamId: 'team-1', 
        teamSlug: 'engineering-team' 
      })

      render(<TeamSwitcher />)

      await waitFor(() => {
        expect(screen.getByText('Engineering Team')).toBeInTheDocument()
      })
    })

    it('should handle errors when loading teams', async () => {
      const error = new Error('Failed to load teams')
      ;(getUserTeams as jest.Mock).mockRejectedValue(error)
      ;(getTeamContext as jest.Mock).mockResolvedValue({ teamId: null, teamSlug: null })

      render(<TeamSwitcher />)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to load teams')
      })
    })
  })

  describe('Dropdown Menu', () => {
    beforeEach(async () => {
      ;(getUserTeams as jest.Mock).mockResolvedValue(mockTeams)
      ;(getTeamContext as jest.Mock).mockResolvedValue({ teamId: 'team-1', teamSlug: 'engineering-team' })
    })

    it('should open dropdown when clicked', async () => {
      const user = userEvent.setup()
      render(<TeamSwitcher />)

      await waitFor(() => {
        expect(screen.getByText('Engineering Team')).toBeInTheDocument()
      })

      // Click the dropdown trigger
      await user.click(screen.getByRole('button'))

      // Check dropdown content
      expect(screen.getByText('Workspaces')).toBeInTheDocument()
      expect(screen.getAllByText('Personal Workspace')).toHaveLength(2) // One in button, one in menu
      expect(screen.getByText('Marketing Team')).toBeInTheDocument()
      expect(screen.getByText('Create Team')).toBeInTheDocument()
    })

    it('should show team details in dropdown', async () => {
      const user = userEvent.setup()
      render(<TeamSwitcher />)

      await waitFor(() => {
        expect(screen.getByText('Engineering Team')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button'))

      // Check team member and prompt counts
      expect(screen.getByText('5 members · 20 prompts')).toBeInTheDocument()
      expect(screen.getByText('3 members · 15 prompts')).toBeInTheDocument()
    })

    it('should show check mark for current workspace', async () => {
      const user = userEvent.setup()
      render(<TeamSwitcher />)

      await waitFor(() => {
        expect(screen.getByText('Engineering Team')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button'))

      // The current team should have a check mark
      const engineeringItem = screen.getByText('Engineering Team').closest('[role="menuitem"]')
      expect(engineeringItem?.querySelector('svg')).toBeInTheDocument()
    })

    it('should show team actions for admin/owner', async () => {
      const user = userEvent.setup()
      render(<TeamSwitcher />)

      await waitFor(() => {
        expect(screen.getByText('Engineering Team')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('Team Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Team Settings')).toBeInTheDocument()
    })

    it('should not show team settings for regular members', async () => {
      ;(getTeamContext as jest.Mock).mockResolvedValue({ 
        teamId: 'team-2', 
        teamSlug: 'marketing-team' 
      })

      const user = userEvent.setup()
      render(<TeamSwitcher />)

      await waitFor(() => {
        expect(screen.getByText('Marketing Team')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('Team Dashboard')).toBeInTheDocument()
      expect(screen.queryByText('Team Settings')).not.toBeInTheDocument()
    })
  })

  describe('Team Switching', () => {
    beforeEach(async () => {
      ;(getUserTeams as jest.Mock).mockResolvedValue(mockTeams)
      ;(getTeamContext as jest.Mock).mockResolvedValue({ teamId: 'team-1', teamSlug: 'engineering-team' })
      ;(setTeamContext as jest.Mock).mockResolvedValue({ success: true })
    })

    it('should switch to different team', async () => {
      const user = userEvent.setup()
      render(<TeamSwitcher />)

      await waitFor(() => {
        expect(screen.getByText('Engineering Team')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('Marketing Team'))

      expect(setTeamContext).toHaveBeenCalledWith('team-2')
      expect(mockRouter.refresh).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('Switched to team context')
    })

    it('should switch to personal workspace', async () => {
      const user = userEvent.setup()
      render(<TeamSwitcher />)

      await waitFor(() => {
        expect(screen.getByText('Engineering Team')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button'))
      
      // Click on the Personal Workspace menu item (not the button text)
      const personalItems = screen.getAllByText('Personal Workspace')
      await user.click(personalItems[personalItems.length - 1])

      expect(setTeamContext).toHaveBeenCalledWith(null)
      expect(mockRouter.refresh).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith('Switched to personal workspace')
    })

    it('should handle errors during team switch', async () => {
      ;(setTeamContext as jest.Mock).mockRejectedValue(new Error('Switch failed'))

      const user = userEvent.setup()
      render(<TeamSwitcher />)

      await waitFor(() => {
        expect(screen.getByText('Engineering Team')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('Marketing Team'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to switch context')
      })
    })
  })

  describe('Navigation', () => {
    beforeEach(async () => {
      ;(getUserTeams as jest.Mock).mockResolvedValue(mockTeams)
      ;(getTeamContext as jest.Mock).mockResolvedValue({ teamId: 'team-1', teamSlug: 'engineering-team' })
    })

    it('should navigate to create team page', async () => {
      const user = userEvent.setup()
      render(<TeamSwitcher />)

      await waitFor(() => {
        expect(screen.getByText('Engineering Team')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('Create Team'))

      expect(mockRouter.push).toHaveBeenCalledWith('/teams/new')
    })

    it('should navigate to team dashboard', async () => {
      const user = userEvent.setup()
      render(<TeamSwitcher />)

      await waitFor(() => {
        expect(screen.getByText('Engineering Team')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('Team Dashboard'))

      expect(mockRouter.push).toHaveBeenCalledWith('/teams/engineering-team')
    })

    it('should navigate to team settings', async () => {
      const user = userEvent.setup()
      render(<TeamSwitcher />)

      await waitFor(() => {
        expect(screen.getByText('Engineering Team')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('Team Settings'))

      expect(mockRouter.push).toHaveBeenCalledWith('/teams/engineering-team/settings')
    })
  })

  describe('UI States', () => {
    it('should close dropdown after selection', async () => {
      ;(getUserTeams as jest.Mock).mockResolvedValue(mockTeams)
      ;(getTeamContext as jest.Mock).mockResolvedValue({ teamId: 'team-1', teamSlug: 'engineering-team' })
      ;(setTeamContext as jest.Mock).mockResolvedValue({ success: true })

      const user = userEvent.setup()
      render(<TeamSwitcher />)

      await waitFor(() => {
        expect(screen.getByText('Engineering Team')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button'))
      expect(screen.getByText('Workspaces')).toBeInTheDocument()

      await user.click(screen.getByText('Marketing Team'))

      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByText('Workspaces')).not.toBeInTheDocument()
      })
    })

    it('should apply custom className', () => {
      ;(getUserTeams as jest.Mock).mockResolvedValue(mockTeams)
      ;(getTeamContext as jest.Mock).mockResolvedValue({ teamId: null, teamSlug: null })

      render(<TeamSwitcher className="custom-class" />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })

    it('should show team logo when available', async () => {
      ;(getUserTeams as jest.Mock).mockResolvedValue(mockTeams)
      ;(getTeamContext as jest.Mock).mockResolvedValue({ 
        teamId: 'team-2', 
        teamSlug: 'marketing-team' 
      })

      render(<TeamSwitcher />)

      await waitFor(() => {
        expect(screen.getByText('Marketing Team')).toBeInTheDocument()
      })

      const avatar = screen.getByRole('img')
      expect(avatar).toHaveAttribute('src', 'https://example.com/logo.png')
    })

    it('should show fallback icon when no logo', async () => {
      ;(getUserTeams as jest.Mock).mockResolvedValue(mockTeams)
      ;(getTeamContext as jest.Mock).mockResolvedValue({ 
        teamId: 'team-1', 
        teamSlug: 'engineering-team' 
      })

      render(<TeamSwitcher />)

      await waitFor(() => {
        expect(screen.getByText('Engineering Team')).toBeInTheDocument()
      })

      // Check for Building2 icon in fallback
      const fallback = document.querySelector('[data-state="closed"]')
      expect(fallback).toBeInTheDocument()
    })
  })
})