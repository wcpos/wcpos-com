import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RegisterForm } from './register-form'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock fetch
global.fetch = vi.fn()

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all form fields', () => {
    render(<RegisterForm />)

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('submits form with correct data', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ success: true }),
    }
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response)

    render(<RegisterForm />)

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: 'John' },
    })
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: 'Doe' },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'john@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    })

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'john@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
        }),
      })
    })

    // Should redirect to account page on success
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/account')
    })
  })

  it('displays error message on registration failure', async () => {
    const mockResponse = {
      ok: false,
      json: async () => ({ error: 'Email already exists' }),
    }
    vi.mocked(fetch).mockResolvedValue(mockResponse as Response)

    render(<RegisterForm />)

    // Fill out and submit form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'existing@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument()
    })

    // Should not redirect on error
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('shows loading state during submission', async () => {
    // Mock a delayed response
    const mockResponse = {
      ok: true,
      json: async () => ({ success: true }),
    }
    vi.mocked(fetch).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockResponse as Response), 100))
    )

    render(<RegisterForm />)

    // Fill out form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    })

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    // Button should show loading state
    expect(screen.getByRole('button', { name: /creating account/i })).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()

    // Wait for completion
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })
  })

  it('handles network errors gracefully', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

    render(<RegisterForm />)

    // Fill out and submit form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })
})