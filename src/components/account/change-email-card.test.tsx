import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../../../messages/pt.json'
import { ChangeEmailCard } from './change-email-card'

const mockFetch = vi.fn()

vi.stubGlobal('fetch', mockFetch)
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

describe('ChangeEmailCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('explains in Portuguese that following the link changes the address', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true })
    render(
      <NextIntlClientProvider locale="pt" messages={messages}>
        <ChangeEmailCard
          currentEmail="old@example.com"
          hasPassword={false}
        />
      </NextIntlClientProvider>
    )

    fireEvent.click(screen.getByTestId('change-email-open'))
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'novo@example.com' },
    })
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)

    expect(
      await screen.findByText(
        'Enviámos uma ligação de confirmação para novo@example.com. O seu endereço muda assim que seguir a ligação.'
      )
    ).toBeInTheDocument()
  })

  it('reveals the password field when the backend requires one', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ errorCode: 'password_required' }),
      })
      .mockResolvedValueOnce({ ok: true })
    render(
      <NextIntlClientProvider locale="pt" messages={messages}>
        <ChangeEmailCard
          currentEmail="old@example.com"
          hasPassword={false}
        />
      </NextIntlClientProvider>
    )

    fireEvent.click(screen.getByTestId('change-email-open'))
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'novo@example.com' },
    })
    fireEvent.submit(screen.getByRole('textbox').closest('form')!)

    const password = await screen.findByLabelText('Palavra-passe atual')
    fireEvent.change(password, { target: { value: 'secret' } })
    fireEvent.submit(password.closest('form')!)

    await screen.findByText('Verifique a sua nova caixa de entrada')
    expect(mockFetch).toHaveBeenLastCalledWith(
      '/api/account/email',
      expect.objectContaining({
        body: JSON.stringify({
          email: 'novo@example.com',
          password: 'secret',
        }),
      })
    )
  })
  it('does not keep the password in state after cancelling', async () => {
    // A credential left in controlled state repopulates the field on reopen
    // and lives on for the rest of the session.
    render(
      <NextIntlClientProvider locale="pt" messages={messages}>
        <ChangeEmailCard currentEmail="old@example.com" hasPassword />
      </NextIntlClientProvider>
    )

    fireEvent.click(screen.getByTestId('change-email-open'))
    const password = () =>
      document.querySelector<HTMLInputElement>('input[type="password"]')!
    fireEvent.change(password(), { target: { value: 'hunter2' } })
    expect(password().value).toBe('hunter2')

    fireEvent.click(screen.getByRole('button', { name: messages.account.profile.changeEmail.cancel }))
    fireEvent.click(screen.getByTestId('change-email-open'))

    expect(password().value).toBe('')
  })
})
