import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithIntl as render } from '@/test/intl'

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/account/profile',
}))

import { ProfileEditForm } from './profile-edit-form'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('ProfileEditForm', () => {
  const originalLocation = window.location

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    })
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
      first_name: 'Updated',
      last_name: 'Name',
      phone: '+15551234567',
      accountProfile: {
        countryCode: 'US',
      },
    })
    // Email is not editable — sending it made Medusa reject EVERY profile
    // save with 400 "Unrecognized fields: 'email'".
    expect(parsedBody).not.toHaveProperty('email')

    expect(
      await screen.findByText('Profile updated successfully.')
    ).toBeInTheDocument()
  })

  it('localizes profile API error codes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ errorCode: 'unauthorized' }),
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

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(
      await screen.findByText('Please sign in again to update your profile.')
    ).toBeInTheDocument()
  })

  it('renders the email field read-only', () => {
    render(
      <ProfileEditForm
        customer={{ email: 'fixed@example.com', metadata: {} }}
      />
    )

    const emailInput = screen.getByLabelText('Email') as HTMLInputElement
    expect(emailInput.value).toBe('fixed@example.com')
    expect(emailInput).toHaveAttribute('readonly')
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

  it('omits the Connections section when no connections are provided', () => {
    render(
      <ProfileEditForm
        customer={{ email: 'noconn@example.com', metadata: {} }}
      />
    )

    expect(screen.queryByText('Connections')).not.toBeInTheDocument()
  })

  it('does not expose account-level Discord linking from the profile', () => {
    const assign = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '', assign, reload: vi.fn() },
    })

    render(
      <ProfileEditForm
        customer={{ email: 'ada@gmail.com', metadata: {} }}
        connections={{
          signIn: { provider: 'google', email: 'ada@gmail.com' },
        }}
      />
    )

    // Google shows a connected state with the account email.
    expect(
      screen.getByText('Connected as ada@gmail.com')
    ).toBeInTheDocument()

    expect(screen.queryByText('Discord')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Connect Discord' })).not.toBeInTheDocument()
  })

  it('labels the sign-in row by the actual provider (GitHub)', () => {
    render(
      <ProfileEditForm
        customer={{ email: 'ada@github.com', metadata: {} }}
        connections={{
          signIn: { provider: 'github', email: 'ada@github.com' },
        }}
      />
    )

    expect(screen.getByText('GitHub')).toBeInTheDocument()
    expect(screen.getByText('Connected as ada@github.com')).toBeInTheDocument()
    // No false Google claim for a GitHub user.
    expect(screen.queryByText('Google')).not.toBeInTheDocument()
  })

  it('shows an email/password sign-in row when no OAuth provider is known', () => {
    render(
      <ProfileEditForm
        customer={{ email: 'ada@example.com', metadata: {} }}
        connections={{
          signIn: { provider: 'email', email: 'ada@example.com' },
        }}
      />
    )

    expect(screen.getByText('Email & password')).toBeInTheDocument()
    expect(screen.queryByText('Google')).not.toBeInTheDocument()
    expect(screen.queryByText('GitHub')).not.toBeInTheDocument()
  })

  it('renders the member-since footer when provided', () => {
    render(
      <ProfileEditForm
        customer={{ email: 'ada@gmail.com', metadata: {} }}
        memberSince="January 2024"
      />
    )

    expect(screen.getByText(/January 2024/)).toBeInTheDocument()
  })
})
