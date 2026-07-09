import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
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

// The row buttons share the "Disconnect" name with the dialog's destructive
// action, so always confirm through the open dialog rather than by position.
async function clickConfirmDisconnect() {
  const dialog = await screen.findByRole('dialog')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Disconnect' }))
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
        // The exact identifier the reset email went to (may differ in casing
        // from the customer record) — the inline state must show THIS.
        sentTo: 'Ada@Gmail.com',
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
    // The toast vanishes; the row keeps saying where the link went, with a
    // resend affordance.
    expect(
      screen.getByText('Setup link sent to Ada@Gmail.com — check your inbox.')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Send it again' })
    ).toBeInTheDocument()
  })

  it('shows the link-sent state on load for a still-unclaimed identity', () => {
    render(
      <ConnectionsCard
        signIn={googleSignIn}
        methods={{ providers: ['emailpass', 'google'], emailpassPending: true }}
      />
    )

    // A minted identity from an earlier visit: the link is out there.
    expect(
      screen.getByText('Setup link sent to ada@gmail.com — check your inbox.')
    ).toBeInTheDocument()
  })

  it('renders which account each provider row is connected to', () => {
    render(
      <ConnectionsCard
        signIn={googleSignIn}
        methods={{
          providers: ['github', 'google'],
          providerDetails: [
            {
              provider: 'google',
              email: 'ada@gmail.com',
              name: 'Ada Lovelace',
              avatar: 'https://lh3.example/photo.jpg',
              handle: null,
            },
            {
              provider: 'github',
              email: 'ada@work.example',
              name: 'Ada Lovelace',
              avatar: 'https://avatars.example/u/1',
              handle: 'adalove',
            },
          ],
        }}
      />
    )

    // "Google · Ada Lovelace" with the email on its own line.
    expect(screen.getByText('· Ada Lovelace', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('ada@gmail.com')).toBeInTheDocument()
    // GitHub prefers the handle over the display name.
    expect(screen.getByText('· @adalove', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('ada@work.example')).toBeInTheDocument()
    // The most recently used provider is attributed.
    expect(screen.getByText('Most recent sign-in')).toBeInTheDocument()
  })

  it('explains a reserved email inline and drops the dead-end button (prop-driven)', () => {
    render(
      <ConnectionsCard
        signIn={googleSignIn}
        methods={{ providers: ['google'], emailpassReserved: true }}
      />
    )

    expect(
      screen.queryByRole('button', { name: 'Set a password' })
    ).not.toBeInTheDocument()
    expect(
      screen.getByText('A password sign-in for ada@gmail.com already exists', {
        exact: false,
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Email support' })).toHaveAttribute(
      'href',
      'mailto:support@wcpos.com'
    )
  })

  it('flips into the reserved explanation when the send 409s', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ errorCode: 'email_identity_reserved' }),
    })

    render(
      <ConnectionsCard signIn={googleSignIn} methods={{ providers: ['google'] }} />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Set a password' }))

    // Persistent inline explanation, not a vanishing toast.
    expect(
      await screen.findByText(
        'A password sign-in for ada@gmail.com already exists',
        { exact: false }
      )
    ).toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('button', { name: 'Set a password' })
    ).not.toBeInTheDocument()
  })

  it('shows when the password was last changed', () => {
    render(
      <ConnectionsCard
        signIn={googleSignIn}
        methods={{
          providers: ['emailpass', 'google'],
          emailpassUpdatedAt: '2026-03-14T09:00:00.000Z',
        }}
      />
    )

    expect(
      screen.getByText('Last changed March 2026')
    ).toBeInTheDocument()
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

    await clickConfirmDisconnect()

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

  it('locks out disconnect while the password email is in flight', async () => {
    // Both handlers rewrite `providers` from their own response; overlapping
    // runs would let whichever settles last clobber the other.
    let settlePasswordEmail: (value: unknown) => void = () => {}
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        settlePasswordEmail = resolve
      })
    )

    render(
      <ConnectionsCard
        signIn={googleSignIn}
        methods={{ providers: ['emailpass', 'google'] }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Change password' }))

    const disconnect = await screen.findByRole('button', { name: 'Disconnect' })
    expect(disconnect).toBeDisabled()
    // Even if the disabled attribute is bypassed, the handler refuses to run.
    fireEvent.click(disconnect)
    expect(screen.queryByText('Disconnect Google?')).not.toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledTimes(1)

    settlePasswordEmail({
      ok: true,
      json: async () => ({ providers: ['emailpass', 'google'] }),
    })

    // Once the in-flight request settles, the controls re-enable.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Disconnect' })).toBeEnabled()
    })
    expect(
      screen.getByRole('button', { name: 'Change password' })
    ).toBeEnabled()
  })

  it('locks out the password email while a disconnect is in flight', async () => {
    let settleDisconnect: (value: unknown) => void = () => {}
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        settleDisconnect = resolve
      })
    )

    render(
      <ConnectionsCard
        signIn={googleSignIn}
        methods={{ providers: ['emailpass', 'google'] }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    await clickConfirmDisconnect()

    // The open dialog marks the card behind it aria-hidden, so reach the
    // password button explicitly rather than through the accessible tree.
    const changePassword = () =>
      screen.getByRole('button', { name: 'Change password', hidden: true })
    await waitFor(() => expect(changePassword()).toBeDisabled())
    fireEvent.click(changePassword())
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).not.toHaveBeenCalledWith(
      '/api/account/password',
      expect.anything()
    )

    settleDisconnect({
      ok: true,
      json: async () => ({ providers: ['emailpass'] }),
    })

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Change password' })
      ).toBeEnabled()
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

    // Rows render in OAUTH_PROVIDERS order, so Google is first.
    const [googleDisconnect] = screen.getAllByRole('button', {
      name: 'Disconnect',
    })
    fireEvent.click(googleDisconnect)
    // Pin which row was opened, so a row reorder fails loudly here.
    expect(await screen.findByText('Disconnect Google?')).toBeInTheDocument()
    await clickConfirmDisconnect()

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
