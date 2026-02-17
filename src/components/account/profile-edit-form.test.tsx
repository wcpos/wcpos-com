import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ProfileEditForm } from './profile-edit-form'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('ProfileEditForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows customers to update profile details', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        customer: {
          email: 'updated@example.com',
          first_name: 'Updated',
          last_name: 'Name',
          phone: '+15551234567',
        },
      }),
    })

    render(
      <ProfileEditForm
        customer={{
          email: 'old@example.com',
          first_name: 'Old',
          last_name: 'Name',
          phone: '',
        }}
      />
    )

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'updated@example.com' },
    })
    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Updated' },
    })
    fireEvent.change(screen.getByLabelText('Phone'), {
      target: { value: '+15551234567' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'updated@example.com',
          first_name: 'Updated',
          last_name: 'Name',
          phone: '+15551234567',
        }),
      })
    })

    expect(
      await screen.findByText('Profile updated successfully.')
    ).toBeInTheDocument()
  })
})
