import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithIntl as render } from '@/test/intl'

vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/account/profile',
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { toast } from 'sonner'
import { ProfileEditForm } from './profile-edit-form'

const emptyBillingDetails = {
  countryCode: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  region: '',
  postalCode: '',
  taxNumber: '',
}

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

  it('prefills billing details from the default billing address projection', () => {
    render(
      <ProfileEditForm
        customer={{ email: 'dk@example.com', metadata: {} }}
        billingDetails={{
          countryCode: 'DK',
          addressLine1: 'Gl. Hovedvej 8',
          addressLine2: '',
          city: 'Aarup',
          region: '',
          postalCode: '5560',
          taxNumber: '',
        }}
      />
    )

    expect(
      (screen.getByLabelText('Country') as HTMLSelectElement).value
    ).toBe('DK')
    expect(
      (screen.getByLabelText('Address line 1') as HTMLInputElement).value
    ).toBe('Gl. Hovedvej 8')
    expect((screen.getByLabelText('City') as HTMLInputElement).value).toBe(
      'Aarup'
    )
  })

  it('autosaves profile details on blur and confirms with a toast', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        customer: {
          email: 'updated@example.com',
          first_name: 'Updated',
          last_name: 'Name',
          phone: '+15551234567',
          metadata: {},
        },
        billingDetails: {
          countryCode: 'US',
          addressLine1: '',
          addressLine2: '',
          city: '',
          region: '',
          postalCode: '',
          taxNumber: '',
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
        billingDetails={emptyBillingDetails}
      />
    )

    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Updated' },
    })
    fireEvent.change(screen.getByLabelText('Phone'), {
      target: { value: '+15551234567' },
    })
    fireEvent.blur(screen.getByLabelText('Phone'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    const [, requestInit] = mockFetch.mock.calls[0]
    const parsedBody = JSON.parse((requestInit as RequestInit).body as string)
    expect(parsedBody).toMatchObject({
      first_name: 'Updated',
      last_name: 'Name',
      phone: '+15551234567',
    })
    // Billing untouched — the payload must not assert (and rewrite) it.
    expect(parsedBody).not.toHaveProperty('billingAddress')
    expect(parsedBody).not.toHaveProperty('accountProfile')
    // Avatar untouched — a name edit must not re-send the data URL.
    expect(parsedBody).not.toHaveProperty('avatar')
    // Email is not editable — sending it made Medusa reject EVERY profile
    // save with 400 "Unrecognized fields: 'email'".
    expect(parsedBody).not.toHaveProperty('email')

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Profile saved')
    })
  })

  it('does not save (or toast) when focus moves without edits', async () => {
    render(
      <ProfileEditForm
        customer={{
          email: 'old@example.com',
          first_name: 'Old',
          last_name: 'Name',
          phone: '',
          metadata: {},
        }}
        billingDetails={emptyBillingDetails}
      />
    )

    fireEvent.blur(screen.getByLabelText('First name'))
    fireEvent.blur(screen.getByLabelText('Phone'))

    expect(mockFetch).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('has no submit button — the form is autosave only', () => {
    render(
      <ProfileEditForm
        customer={{ email: 'old@example.com', metadata: {} }}
        billingDetails={emptyBillingDetails}
      />
    )

    expect(
      screen.queryByRole('button', { name: 'Save changes' })
    ).not.toBeInTheDocument()
  })

  it('submits billing details on blur only when the user changed them', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        customer: { email: 'old@example.com', metadata: {} },
        billingDetails: {
          countryCode: 'US',
          addressLine1: '1 New St',
          addressLine2: '',
          city: 'Perth',
          region: '',
          postalCode: '',
          taxNumber: '',
        },
      }),
    })

    render(
      <ProfileEditForm
        customer={{ email: 'old@example.com', metadata: {} }}
        billingDetails={emptyBillingDetails}
      />
    )

    fireEvent.change(screen.getByLabelText('Address line 1'), {
      target: { value: '1 New St' },
    })
    fireEvent.change(screen.getByLabelText('City'), {
      target: { value: 'Perth' },
    })
    fireEvent.blur(screen.getByLabelText('City'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    const [, requestInit] = mockFetch.mock.calls[0]
    const parsedBody = JSON.parse((requestInit as RequestInit).body as string)
    expect(parsedBody.billingAddress).toMatchObject({
      addressLine1: '1 New St',
      city: 'Perth',
    })
    // Profile fields untouched — a billing edit must not rewrite the customer.
    expect(parsedBody).not.toHaveProperty('first_name')
  })

  it('does not save a bare country change when no address exists', () => {
    // Mirrors the server rule: a country with no address content never
    // creates an address record, so saving it would toast success while
    // persisting nothing.
    render(
      <ProfileEditForm
        customer={{ email: 'old@example.com', metadata: {} }}
        billingDetails={emptyBillingDetails}
      />
    )

    fireEvent.change(screen.getByLabelText('Country'), {
      target: { value: 'AU' },
    })

    expect(mockFetch).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('saves a country change immediately when the address has content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        customer: { email: 'old@example.com', metadata: {} },
        billingDetails: {
          countryCode: 'AU',
          addressLine1: '1 Existing St',
          addressLine2: '',
          city: 'Perth',
          region: '',
          postalCode: '',
          taxNumber: '',
        },
      }),
    })

    render(
      <ProfileEditForm
        customer={{ email: 'old@example.com', metadata: {} }}
        billingDetails={{
          ...emptyBillingDetails,
          countryCode: 'US',
          addressLine1: '1 Existing St',
          city: 'Perth',
        }}
      />
    )

    fireEvent.change(screen.getByLabelText('Country'), {
      target: { value: 'AU' },
    })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    const [, requestInit] = mockFetch.mock.calls[0]
    const parsedBody = JSON.parse((requestInit as RequestInit).body as string)
    expect(parsedBody.billingAddress).toMatchObject({
      countryCode: 'AU',
      addressLine1: '1 Existing St',
    })
  })

  it('saves on Enter without waiting for blur', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        customer: {
          email: 'old@example.com',
          first_name: 'Entered',
          last_name: 'Name',
          phone: '',
          metadata: {},
        },
        billingDetails: emptyBillingDetails,
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
        billingDetails={emptyBillingDetails}
      />
    )

    const firstName = screen.getByLabelText('First name')
    fireEvent.change(firstName, { target: { value: 'Entered' } })
    fireEvent.keyDown(firstName, { key: 'Enter' })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    const [, requestInit] = mockFetch.mock.calls[0]
    const parsedBody = JSON.parse((requestInit as RequestInit).body as string)
    expect(parsedBody).toMatchObject({ first_name: 'Entered' })
  })

  it('localizes profile API error codes into an error toast', async () => {
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
        billingDetails={emptyBillingDetails}
      />
    )

    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Changed' },
    })
    fireEvent.blur(screen.getByLabelText('First name'))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Please sign in again to update your profile.'
      )
    })
  })

  it('uploads a new avatar from the identity card and saves immediately', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        customer: {
          email: 'ada@example.com',
          metadata: {
            account_profile: { avatarDataUrl: 'data:image/png;base64,abc' },
          },
        },
        billingDetails: emptyBillingDetails,
      }),
    })

    const { container } = render(
      <ProfileEditForm
        customer={{ email: 'ada@example.com', metadata: {} }}
        billingDetails={emptyBillingDetails}
      />
    )

    expect(
      screen.getByRole('button', { name: 'Change profile photo' })
    ).toBeInTheDocument()

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    const file = new File(['fake-image-bytes'], 'avatar.png', {
      type: 'image/png',
    })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    const [, requestInit] = mockFetch.mock.calls[0]
    const parsedBody = JSON.parse((requestInit as RequestInit).body as string)
    expect(parsedBody.avatar.avatarDataUrl).toMatch(/^data:image\//)
    expect(parsedBody.avatar.avatarUrl).toBeNull()
    // An avatar pick saves the avatar alone.
    expect(parsedBody).not.toHaveProperty('first_name')
    expect(parsedBody).not.toHaveProperty('billingAddress')

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Profile saved')
    })
  })

  it('rejects oversized avatar files with an error toast and no save', () => {
    const { container } = render(
      <ProfileEditForm
        customer={{ email: 'ada@example.com', metadata: {} }}
        billingDetails={emptyBillingDetails}
      />
    )

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    const bigFile = new File([new ArrayBuffer(1024 * 1024 + 1)], 'big.png', {
      type: 'image/png',
    })
    fireEvent.change(fileInput, { target: { files: [bigFile] } })

    expect(toast.error).toHaveBeenCalledWith(
      'Avatar image must be 1MB or smaller.'
    )
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('removes a custom avatar from the identity card menu', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        customer: { email: 'ada@example.com', metadata: {} },
        billingDetails: emptyBillingDetails,
      }),
    })

    render(
      <ProfileEditForm
        customer={{
          email: 'ada@example.com',
          metadata: {
            account_profile: { avatarDataUrl: 'data:image/png;base64,abc' },
          },
        }}
        billingDetails={emptyBillingDetails}
      />
    )

    // Open the avatar menu via keyboard (Radix trigger).
    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Change profile photo' }),
      { key: 'Enter' }
    )

    fireEvent.click(await screen.findByText('Remove photo'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    const [, requestInit] = mockFetch.mock.calls[0]
    const parsedBody = JSON.parse((requestInit as RequestInit).body as string)
    expect(parsedBody.avatar).toEqual({ avatarDataUrl: null, avatarUrl: null })
  })

  it('renders the email field read-only', () => {
    render(
      <ProfileEditForm
        customer={{ email: 'fixed@example.com', metadata: {} }}
        billingDetails={emptyBillingDetails}
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
        billingDetails={emptyBillingDetails}
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
        billingDetails={emptyBillingDetails}
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
        billingDetails={emptyBillingDetails}
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
        billingDetails={emptyBillingDetails}
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
        billingDetails={emptyBillingDetails}
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
        billingDetails={emptyBillingDetails}
        memberSince="January 2024"
      />
    )

    expect(screen.getByText(/January 2024/)).toBeInTheDocument()
  })
})
