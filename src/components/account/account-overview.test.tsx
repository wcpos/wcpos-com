import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AccountOverview } from './account-overview'
import type { User } from '@/services/core/database/schema'

// Mock user data for testing
const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  password: null,
  firstName: 'John',
  lastName: 'Doe',
  role: 'user',
  status: 'active',
  avatar: null,
  emailVerified: true,
  emailVerificationToken: null,
  passwordResetToken: null,
  passwordResetExpires: null,
  lastLoginAt: new Date('2026-01-10T10:00:00Z'),
  googleId: null,
  githubId: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-10T10:00:00Z'),
}

describe('AccountOverview', () => {
  it('renders user information correctly', () => {
    render(<AccountOverview user={mockUser} />)

    // Check if the component title is rendered
    expect(screen.getByText('Account Information')).toBeInTheDocument()

    // Check if user email is displayed
    expect(screen.getByText('test@example.com')).toBeInTheDocument()

    // Check if user name is displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument()

    // Check if status is displayed
    expect(screen.getByText('active')).toBeInTheDocument()

    // Check if email verification status is shown
    expect(screen.getByText('Verified')).toBeInTheDocument()
  })

  it('renders member since date correctly', () => {
    render(<AccountOverview user={mockUser} />)

    // Check if member since date is formatted correctly
    expect(screen.getByText('January 1, 2025')).toBeInTheDocument()
  })

  it('handles user without first name', () => {
    const userWithoutName = { ...mockUser, firstName: null, lastName: null }
    render(<AccountOverview user={userWithoutName} />)

    // Should still render email
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    
    // Name section should not be rendered
    expect(screen.queryByText('Name:')).not.toBeInTheDocument()
  })

  it('handles unverified email status', () => {
    const unverifiedUser = { ...mockUser, emailVerified: false }
    render(<AccountOverview user={unverifiedUser} />)

    expect(screen.getByText('Unverified')).toBeInTheDocument()
  })

  it('handles different user statuses', () => {
    const pendingUser = { ...mockUser, status: 'pending' as const }
    render(<AccountOverview user={pendingUser} />)

    expect(screen.getByText('pending')).toBeInTheDocument()
  })

  it('handles user without last login', () => {
    const userWithoutLastLogin = { ...mockUser, lastLoginAt: null }
    render(<AccountOverview user={userWithoutLastLogin} />)

    // Should still render other information
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    
    // Last login should not be shown
    expect(screen.queryByText('Last login:')).not.toBeInTheDocument()
  })
})