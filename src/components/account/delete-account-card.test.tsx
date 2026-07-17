import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithIntl as render } from '@/test/intl'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockNavigate = vi.fn()
vi.mock('@/lib/safe-redirect', () => ({
  navigateAfterAuthChange: (...args: unknown[]) => mockNavigate(...args),
}))

import { toast } from 'sonner'
import { DeleteAccountCard } from './delete-account-card'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const EMAIL = 'ada@example.com'

async function openDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Delete account…' }))
  return await screen.findByRole('dialog')
}

function confirmButton(dialog: HTMLElement) {
  return within(dialog).getByRole('button', { name: 'Permanently delete' })
}

describe('DeleteAccountCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the danger zone with an inert trigger', () => {
    render(<DeleteAccountCard email={EMAIL} />)

    expect(screen.getByText('Delete account')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('keeps the destructive button disarmed until the email matches', async () => {
    render(<DeleteAccountCard email={EMAIL} />)
    const dialog = await openDialog()

    expect(confirmButton(dialog)).toBeDisabled()

    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: 'wrong@example.com' },
    })
    expect(confirmButton(dialog)).toBeDisabled()

    // Case and whitespace must not block a genuine confirmation.
    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: '  ADA@example.com ' },
    })
    expect(confirmButton(dialog)).toBeEnabled()
  })

  it('deletes and navigates with a full page load on success', async () => {
    mockFetch.mockResolvedValue({ ok: true })
    render(<DeleteAccountCard email={EMAIL} />)
    const dialog = await openDialog()

    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: EMAIL },
    })
    fireEvent.click(confirmButton(dialog))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/account/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL }),
      })
      expect(mockNavigate).toHaveBeenCalledWith('/', 'en')
    })
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('surfaces a failure and stays signed in', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ errorCode: 'account_deletion_failed' }),
    })
    render(<DeleteAccountCard email={EMAIL} />)
    const dialog = await openDialog()

    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: EMAIL },
    })
    fireEvent.click(confirmButton(dialog))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "We couldn't delete your account. Please try again or contact support."
      )
    })
    expect(mockNavigate).not.toHaveBeenCalled()
    // The dialog stays open for a retry.
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('translates read-only impersonation errors specifically', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ errorCode: 'read_only_inspection' }),
    })
    render(<DeleteAccountCard email={EMAIL} />)
    const dialog = await openDialog()

    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: EMAIL },
    })
    fireEvent.click(confirmButton(dialog))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'You are viewing this account in read-only mode.'
      )
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('tells the user to sign in again when the session has expired', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ errorCode: 'unauthorized' }),
    })
    render(<DeleteAccountCard email={EMAIL} />)
    const dialog = await openDialog()

    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: EMAIL },
    })
    fireEvent.click(confirmButton(dialog))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Please sign in again to update your profile.'
      )
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
