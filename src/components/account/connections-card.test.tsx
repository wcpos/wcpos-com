import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithIntl as render } from '@/test/intl'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { toast } from 'sonner'
import { ConnectionsCard } from './connections-card'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const googleSignIn = {
  provider: 'google' as const,
  email: 'ada@gmail.com',
}

describe('ConnectionsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('degrades to the read-only single row without DB truth', () => {
    render(<ConnectionsCard signIn={googleSignIn} methods={null} />)

    expect(screen.getByText('Google')).toBeInTheDocument()
    expect(screen.getByText('Connected as ada@gmail.com')).toBeInTheDocument()
    expect(screen.queryByText('Disconnect')).not.toBeInTheDocument()
    expect(screen.queryByText('Set a password')).not.toBeInTheDocument()
  })

  it('offers "Set a password" to an OAuth-only account and hides disconnect', () => {
    render(
      <ConnectionsCard signIn={googleSignIn} methods={{ providers: ['google'] }} />
    )

    expect(screen.getByText('Google')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Set a password' })
    ).toBeInTheDocument()
    // Only one method: disconnect would always fail the last-method guard.
    expect(screen.queryByText('Disconnect')).not.toBeInTheDocument()
  })

  it('offers "Change password" and disconnect when a password exists', () => {
    render(
      <ConnectionsCard
        signIn={googleSignIn}
        methods={{ providers: ['emailpass', 'google'] }}
      />
    )

    expect(
      screen.getByRole('button', { name: 'Change password' })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument()
  })

  it('sends the password email; a pending identity stays "Set a password" with no disconnect', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sent: true,
        created: true,
        providers: ['emailpass', 'google'],
        // The minted identity holds an unusable placeholder password until
        // the reset link is claimed — it must not unlock disconnects.
        emailpassPending: true,
      }),
    })

    render(
      <ConnectionsCard signIn={googleSignIn} methods={{ providers: ['google'] }} />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Set a password' }))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/account/password', {
        method: 'POST',
      })
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Check your inbox — we sent you a link to set your password.'
      )
    })
    expect(
      screen.getByRole('button', { name: 'Set a password' })
    ).toBeInTheDocument()
    expect(screen.queryByText('Disconnect')).not.toBeInTheDocument()
  })

  it('treats a pending emailpass identity as no password (prop-driven)', () => {
    render(
      <ConnectionsCard
        signIn={googleSignIn}
        methods={{ providers: ['emailpass', 'google'], emailpassPending: true }}
      />
    )

    expect(
      screen.getByRole('button', { name: 'Set a password' })
    ).toBeInTheDocument()
    expect(screen.queryByText('Disconnect')).not.toBeInTheDocument()
  })

  it('confirms before disconnecting, then removes the provider row', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ providers: ['emailpass'] }),
    })

    render(
      <ConnectionsCard
        signIn={googleSignIn}
        methods={{ providers: ['emailpass', 'google'] }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    // Nothing sent until the dialog confirms.
    expect(mockFetch).not.toHaveBeenCalled()
    expect(await screen.findByText('Disconnect Google?')).toBeInTheDocument()

    // The dialog's destructive action (the row button is hidden behind the
    // overlay now); it is the last "Disconnect" button rendered.
    const confirmButtons = screen.getAllByRole('button', { name: 'Disconnect' })
    fireEvent.click(confirmButtons[confirmButtons.length - 1])

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/account/connections/google', {
        method: 'DELETE',
      })
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Google disconnected.')
    })
    await waitFor(() => {
      expect(screen.queryByText('Google')).not.toBeInTheDocument()
    })
  })

  it('surfaces the last-method guard as a localized error toast', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ errorCode: 'last_sign_in_method' }),
    })

    render(
      <ConnectionsCard
        signIn={googleSignIn}
        methods={{ providers: ['github', 'google'] }}
      />
    )

    const disconnectButtons = screen.getAllByRole('button', {
      name: 'Disconnect',
    })
    fireEvent.click(disconnectButtons[0])
    const confirmButtons = await screen.findAllByRole('button', {
      name: 'Disconnect',
    })
    fireEvent.click(confirmButtons[confirmButtons.length - 1])

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'This is your only way to sign in. Set a password first.'
      )
    })
    // Row remains connected.
    expect(screen.getByText('Google')).toBeInTheDocument()
  })

  it('never renders a Discord row (managed per-licence)', () => {
    render(
      <ConnectionsCard
        signIn={googleSignIn}
        methods={{ providers: ['discord', 'emailpass', 'google'] }}
      />
    )

    expect(screen.queryByText('Discord')).not.toBeInTheDocument()
  })
})
