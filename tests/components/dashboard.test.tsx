import { render, screen } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { PublicDashboard } from '@/components/dashboard/PublicDashboard'

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
})

// Mock next-auth
jest.mock('next-auth/react')

describe('Dashboard Components', () => {
  describe('PublicDashboard', () => {
    it('should render public dashboard content', () => {
      render(<PublicDashboard />)

      // Check for main heading
      expect(
        screen.getByText('Welcome to Health Insurance Help Desk')
      ).toBeInTheDocument()

      // Check for CTA buttons
      expect(screen.getByText('Get a Quote')).toBeInTheDocument()
      expect(screen.getByText('Sign Up')).toBeInTheDocument()

      // Check for feature cards
      expect(screen.getByText('Compare Plans')).toBeInTheDocument()
      expect(screen.getByText('Find Hospitals')).toBeInTheDocument()
      expect(screen.getByText('Expert Support')).toBeInTheDocument()

      // Check for benefits section
      expect(screen.getByText('Why Choose Us?')).toBeInTheDocument()
      expect(screen.getByText('Easy Comparison')).toBeInTheDocument()
      expect(screen.getByText('Instant Quotes')).toBeInTheDocument()

      // Check for navigation links
      expect(screen.getByRole('link', { name: 'Get a Quote' })).toHaveAttribute(
        'href',
        '/quote'
      )
      expect(screen.getByRole('link', { name: 'Sign Up' })).toHaveAttribute(
        'href',
        '/auth/register'
      )
    })

    it('should have proper navigation links in feature cards', () => {
      render(<PublicDashboard />)

      // Compare Plans card
      expect(
        screen.getByRole('link', { name: 'Compare Now' })
      ).toHaveAttribute('href', '/compare')

      // Find Hospitals card
      expect(
        screen.getByRole('link', { name: 'Search Hospitals' })
      ).toHaveAttribute('href', '/hospitals')

      // Expert Support card
      expect(
        screen.getByRole('link', { name: 'Get Started' })
      ).toHaveAttribute('href', '/auth/register')
    })
  })

  describe('Dashboard Page', () => {
    it('should show public dashboard for unauthenticated users', () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      })

      render(<PublicDashboard />)

      expect(
        screen.getByText('Welcome to Health Insurance Help Desk')
      ).toBeInTheDocument()
    })

    it('should show loading state while session is loading', () => {
      ;(useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
      })

      render(<PublicDashboard />)

      // The loading state should still show the public dashboard
      expect(
        screen.getByText('Welcome to Health Insurance Help Desk')
      ).toBeInTheDocument()
    })
  })

  describe('Dashboard Features', () => {
    it('should display correct feature descriptions', () => {
      render(<PublicDashboard />)

      // Compare Plans feature
      expect(
        screen.getByText(
          'Make informed decisions by comparing benefits, premiums, and coverage across multiple plans.'
        )
      ).toBeInTheDocument()

      // Find Hospitals feature
      expect(
        screen.getByText(
          'Search our extensive network of hospitals and healthcare providers.'
        )
      ).toBeInTheDocument()

      // Expert Support feature
      expect(
        screen.getByText(
          'Our team of experts is here to help you choose the right insurance plan.'
        )
      ).toBeInTheDocument()
    })

    it('should display benefits with correct descriptions', () => {
      render(<PublicDashboard />)

      // Easy Comparison benefit
      expect(
        screen.getByText(
          'Compare multiple insurance plans side by side to find the best fit.'
        )
      ).toBeInTheDocument()

      // Instant Quotes benefit
      expect(
        screen.getByText('Get personalized insurance quotes in minutes.')
      ).toBeInTheDocument()
    })

    it('should display call-to-action section', () => {
      render(<PublicDashboard />)

      expect(screen.getByText('Ready to Get Started?')).toBeInTheDocument()
      expect(
        screen.getByText(
          'Create an account to save your quotes and manage your insurance plans.'
        )
      ).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: 'Create Free Account' })
      ).toHaveAttribute('href', '/auth/register')
    })
  })
}) 