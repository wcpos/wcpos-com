import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithIntl as render } from '@/test/intl'
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

  it('omits the Connections section when no connections are provided', () => {
    render(
      <ProfileEditForm
        customer={{ email: 'noconn@example.com', metadata: {} }}
      />
    )

    expect(screen.queryByText('Connections')).not.toBeInTheDocument()
  })

  it('shows a Connect Discord action when Discord is not linked', () => {
    const assign = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '', assign, reload: vi.fn() },
    })

    render(
      <ProfileEditForm
        customer={{ email: 'ada@gmail.com', metadata: {} }}
        connections={{
          google: { email: 'ada@gmail.com' },
          discord: { connected: false, configured: true },
          discordReturnTo: '/en/account/profile',
        }}
      />
    )

    // Google shows a connected state with the account email.
    expect(
      screen.getByText('Connected as ada@gmail.com')
    ).toBeInTheDocument()

    const connectButton = screen.getByRole('button', {
      name: 'Connect Discord',
    })
    fireEvent.click(connectButton)
    expect(window.location.href).toBe(
      '/api/discord/link?return_to=%2Fen%2Faccount%2Fprofile'
    )
  })

  it('hides the Connect Discord action when Discord is not configured', () => {
    render(
      <ProfileEditForm
        customer={{ email: 'ada@gmail.com', metadata: {} }}
        connections={{
          google: { email: 'ada@gmail.com' },
          discord: { connected: false, configured: false },
          discordReturnTo: '/en/account/profile',
        }}
      />
    )

    expect(
      screen.queryByRole('button', { name: 'Connect Discord' })
    ).not.toBeInTheDocument()
    expect(
      screen.getByText('Discord linking is not configured yet.')
    ).toBeInTheDocument()
  })

  it('shows the linked Discord handle and disconnect action', async () => {
    const reload = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '', reload },
    })
    mockFetch.mockResolvedValueOnce({ ok: true, redirected: false })

    render(
      <ProfileEditForm
        customer={{ email: 'ada@gmail.com', metadata: {} }}
        connections={{
          google: { email: 'ada@gmail.com' },
          discord: { connected: true, username: 'ada' },
          discordReturnTo: '/en/account/profile',
        }}
      />
    )

    expect(screen.getByText('@ada')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/discord/unlink',
        expect.objectContaining({ method: 'POST' })
      )
    })
    await waitFor(() => {
      expect(reload).toHaveBeenCalled()
    })
  })

  it('shows an error when Discord unlink redirects to an error status', async () => {
    const reload = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '', origin: 'http://localhost:3000', reload },
    })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      redirected: true,
      url: 'http://localhost:3000/account?discord=error',
    })

    render(
      <ProfileEditForm
        customer={{ email: 'ada@gmail.com', metadata: {} }}
        connections={{
          google: { email: 'ada@gmail.com' },
          discord: { connected: true, username: 'ada' },
          discordReturnTo: '/en/account/profile',
        }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))

    expect(
      await screen.findByText('Could not disconnect. Please try again.')
    ).toBeInTheDocument()
    expect(reload).not.toHaveBeenCalled()
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
