import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UserNav } from './user-nav'
import type { User } from '@/services/core/database/schema'

// Mock user data for testing
const mockUser: User = {
  id: 'test-user-id',
  email: 'john.doe@example.com',
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
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-10T10:00:00Z'),
}

describe('UserNav', () => {
  it('displays user name when firstName and lastName are available', () => {
    render(<UserNav user={mockUser} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('displays email when firstName is not available', () => {
    const userWithoutName = { ...mockUser, firstName: null, lastName: null }
    render(<UserNav user={userWithoutName} />)

    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
  })

  it('displays correct initials for user with first and last name', () => {
    render(<UserNav user={mockUser} />)

    // Check if initials are displayed in avatar fallback
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('displays correct initial for user with email only', () => {
    const userWithoutName = { ...mockUser, firstName: null, lastName: null }
    render(<UserNav user={userWithoutName} />)

    // Should show first letter of email
    expect(screen.getByText('J')).toBeInTheDocument()
  })

  it('handles user with firstName but no lastName', () => {
    const userWithFirstNameOnly = { ...mockUser, lastName: null }
    render(<UserNav user={userWithFirstNameOnly} />)

    expect(screen.getByText('John')).toBeInTheDocument()
  })

  it('renders avatar fallback when no avatar image is provided', () => {
    render(<UserNav user={mockUser} />)

    // When no avatar image is provided, it should show initials in fallback
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('renders avatar fallback with email initial when no name', () => {
    const userWithoutName = { ...mockUser, firstName: null, lastName: null }
    render(<UserNav user={userWithoutName} />)

    // Should show first letter of email
    expect(screen.getByText('J')).toBeInTheDocument()
  })

  it('renders dropdown menu trigger', () => {
    render(<UserNav user={mockUser} />)

    // The dropdown trigger should be present
    const trigger = screen.getByRole('button')
    expect(trigger).toBeInTheDocument()
  })
})