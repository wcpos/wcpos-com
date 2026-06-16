import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithIntl as render } from '@/test/intl'
import { ProfileDiscordControls, ProfileEditForm } from './profile-edit-form'

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

  it('offers Discord linking from the profile page', () => {
    render(
      <ProfileDiscordControls
        configured
        customerMetadata={{}}
        returnTo="/en/account/profile"
      />
    )

    const connectButton = screen.getByRole('button', {
      name: 'Connect Discord',
    })
    const form = connectButton.closest('form')

    expect(screen.getByText('Discord')).toBeInTheDocument()
    expect(form).toHaveAttribute('action', '/api/discord/link')
    expect(form).toHaveAttribute('method', 'get')
    expect(form?.querySelector('input[name="return_to"]')).toHaveValue(
      '/en/account/profile'
    )
  })

  it('shows Discord status and linked account actions', () => {
    render(
      <ProfileDiscordControls
        configured
        customerMetadata={{
          discord_user_id: 'discord_123',
          discord_username: 'pat',
          discord_linked_at: '2026-06-16T00:00:00.000Z',
        }}
        discordStatus="synced"
        returnTo="/en/account/profile"
      />
    )

    expect(screen.getByText('Discord roles synced.')).toBeInTheDocument()
    expect(screen.getByText('pat')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Resync roles' }).closest('form')
    ).toHaveAttribute('action', '/api/discord/resync')
    expect(
      screen.getByRole('button', { name: 'Disconnect' }).closest('form')
    ).toHaveAttribute('action', '/api/discord/unlink')
  })
})
