import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const { getImpersonation, getCustomer } = vi.hoisted(() => ({
  getImpersonation: vi.fn(),
  getCustomer: vi.fn(),
}))

vi.mock('@/lib/impersonation', () => ({ getImpersonation }))
vi.mock('@/lib/medusa-auth', () => ({ getCustomer }))
vi.mock('next-intl/server', () => ({
  getTranslations: async () => {
    const translate = (key: string) => {
      const messages: Record<string, string> = {
        exit: 'Exit',
        securityHold: 'Security hold active',
      }
      return messages[key] ?? key
    }
    translate.rich = (
      _key: string,
      values: Record<string, unknown>
    ) => `Viewing ${String(values.target)} as read-only`
    return translate
  },
}))

import { ImpersonationBanner } from './impersonation-banner'

const target = {
  id: 'cus_target',
  email: 'target@example.com',
  has_account: true,
  created_at: '2026-07-12T00:00:00.000Z',
  updated_at: '2026-07-12T00:00:00.000Z',
}

describe('ImpersonationBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getImpersonation.mockResolvedValue({
      adminEmail: 'owner@example.com',
      targetId: target.id,
    })
  })

  it('keeps an ordinary target visibly read-only without a hold label', async () => {
    getCustomer.mockResolvedValue({
      ...target,
      metadata: { security_hold: { active: false } },
    })

    render(await ImpersonationBanner({ locale: 'en' }))

    expect(
      screen.getByText('Viewing target@example.com as read-only')
    ).toBeInTheDocument()
    expect(screen.queryByText('Security hold active')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Exit' }).closest('form')
    ).toHaveAttribute('action', '/api/account/impersonate/exit')
  })

  it('visibly identifies a target with a strict active security hold', async () => {
    getCustomer.mockResolvedValue({
      ...target,
      metadata: { security_hold: { active: true } },
    })

    render(await ImpersonationBanner({ locale: 'en' }))

    expect(screen.getByText('Security hold active')).toBeInTheDocument()
    expect(
      screen.getByText('Viewing target@example.com as read-only')
    ).toBeInTheDocument()
  })
})
