import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ANALYTICS_CONSENT_COOKIE } from './consent'
import { trackClientEvent } from './client-events'

type WindowWithPostHog = Window & {
  posthog?: {
    capture?: (name: string, props?: Record<string, unknown>) => void
  }
}

function setConsentCookie(value: string | null) {
  if (value === null) {
    document.cookie = `${ANALYTICS_CONSENT_COOKIE}=; Path=/; Max-Age=0`
    return
  }
  document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${value}; Path=/`
}

describe('trackClientEvent', () => {
  const capture = vi.fn()

  beforeEach(() => {
    capture.mockReset()
    ;(window as WindowWithPostHog).posthog = { capture }
    setConsentCookie(null)
  })

  it('does not capture without a consent decision', () => {
    trackClientEvent('cta_clicked', { page: '/' })

    expect(capture).not.toHaveBeenCalled()
  })

  it('does not capture when consent is denied', () => {
    setConsentCookie('denied')

    trackClientEvent('cta_clicked', { page: '/' })

    expect(capture).not.toHaveBeenCalled()
  })

  it('captures when consent is granted', () => {
    setConsentCookie('granted')

    trackClientEvent('cta_clicked', { page: '/' })

    expect(capture).toHaveBeenCalledWith('cta_clicked', { page: '/' })
  })
})
