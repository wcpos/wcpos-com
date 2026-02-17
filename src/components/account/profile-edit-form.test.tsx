import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ProfileEditForm } from './profile-edit-form'

vi.mock('next-intl', () => ({
  useLocale: () => 'en-US',
}))

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
          metadata: {
            account_profile: {
              countryCode: 'US',
            },
          },
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
          metadata: {},
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
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    const [, requestInit] = mockFetch.mock.calls[0]
    const parsedBody = JSON.parse((requestInit as RequestInit).body as string)
    expect(parsedBody).toMatchObject({
      email: 'updated@example.com',
      first_name: 'Updated',
      last_name: 'Name',
      phone: '+15551234567',
      accountProfile: {
        countryCode: 'US',
      },
    })

    expect(
      await screen.findByText('Profile updated successfully.')
    ).toBeInTheDocument()
  })

  it('lists worldwide country options', () => {
    render(
      <ProfileEditForm
        customer={{
          email: 'world@example.com',
          metadata: {},
        }}
      />
    )

    const countrySelect = screen.getByLabelText('Country')
    const options = Array.from(countrySelect.querySelectorAll('option')).map(
      (option) => option.textContent
    )

    expect(options.length).toBeGreaterThan(200)
    expect(options.some((label) => label?.includes('Afghanistan'))).toBe(true)
    expect(options.some((label) => label?.includes('Zimbabwe'))).toBe(true)
  })
})
