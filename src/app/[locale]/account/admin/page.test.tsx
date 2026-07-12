import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { startImpersonationAction } = vi.hoisted(() => ({
  startImpersonationAction: vi.fn(),
}))

const translations: Record<string, string> = {
  title: 'Inspect a customer (read-only)',
  description: 'Enter a customer email to inspect their account.',
  submit: 'View as',
  'errors.not_found': 'No customer was found with that email.',
  'errors.rate_limited': 'Too many lookups. Wait a few minutes and try again.',
  'errors.forbidden': 'Your owner session is no longer authorized.',
}

vi.mock('next/navigation', () => ({ notFound: vi.fn() }))
vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => translations[key] ?? key,
}))
vi.mock('@/lib/medusa-auth', () => ({
  getSessionCustomer: async () => ({ email: 'paul@kilbot.com' }),
}))
vi.mock('@/lib/admin', () => ({ isAdmin: () => true }))
vi.mock('./actions', () => ({
  startImpersonationAction,
  startImpersonationFormAction: async (
    locale: string,
    _previousState: unknown,
    formData: FormData
  ) =>
    startImpersonationAction({
      email: String(formData.get('email') ?? ''),
      locale,
    }),
}))

import AdminInspectPage from './page'

async function submitLookup(result: { error: string }) {
  startImpersonationAction.mockResolvedValueOnce(result)
  render(
    await AdminInspectPage({
      params: Promise.resolve({ locale: 'en' }),
    })
  )

  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'Private.Target@Example.com' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'View as' }))
}

describe('AdminInspectPage action state', () => {
  beforeEach(() => {
    startImpersonationAction.mockReset()
  })

  it.each([
    ['not_found', 'No customer was found with that email.'],
    ['rate_limited', 'Too many lookups. Wait a few minutes and try again.'],
    ['forbidden', 'Your owner session is no longer authorized.'],
  ])('displays a localized %s failure', async (error, message) => {
    await submitLookup({ error })

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })

  it('does not echo the searched email outside the input', async () => {
    await submitLookup({ error: 'not_found' })

    await waitFor(() =>
      expect(startImpersonationAction).toHaveBeenCalledWith({
        email: 'Private.Target@Example.com',
        locale: 'en',
      })
    )
    expect(document.body).not.toHaveTextContent('Private.Target@Example.com')
    expect(document.body.innerHTML).not.toContain('Private.Target@Example.com')
    expect(document.body.innerHTML).not.toContain('private.target@example.com')
  })
})
