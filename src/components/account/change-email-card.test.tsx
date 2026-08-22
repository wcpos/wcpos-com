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
})
