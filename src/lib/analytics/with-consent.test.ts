import { describe, expect, it, vi } from 'vitest'
import { withConsent } from './with-consent'
import type { AnalyticsRecorder } from './types'

describe('withConsent', () => {
  it('forwards the event unchanged when consent is granted', () => {
    const capture = vi.fn()
    const inner: AnalyticsRecorder = { capture }
    const gated = withConsent(inner, () => true)

    gated.capture({ name: 'cta_clicked', properties: { page: '/' } })

    expect(capture).toHaveBeenCalledTimes(1)
    expect(capture).toHaveBeenCalledWith({
      name: 'cta_clicked',
      properties: { page: '/' },
    })
  })

  it('drops the event when consent is not granted', () => {
    const capture = vi.fn()
    const inner: AnalyticsRecorder = { capture }
    const gated = withConsent(inner, () => false)

    gated.capture({ name: 'cta_clicked' })

    expect(capture).not.toHaveBeenCalled()
  })

  it('re-evaluates the predicate on every capture', () => {
    const capture = vi.fn()
    const inner: AnalyticsRecorder = { capture }
    let granted = false
    const gated = withConsent(inner, () => granted)

    gated.capture({ name: 'first' })
    granted = true
    gated.capture({ name: 'second' })

    expect(capture).toHaveBeenCalledTimes(1)
    expect(capture).toHaveBeenCalledWith({ name: 'second' })
  })

  it('does not throw when the consent predicate throws', () => {
    const inner: AnalyticsRecorder = { capture: vi.fn() }
    const gated = withConsent(inner, () => {
      throw new Error('cookie read failed')
    })

    expect(() => gated.capture({ name: 'cta_clicked' })).not.toThrow()
  })

  it('does not throw when the inner recorder throws', () => {
    const inner: AnalyticsRecorder = {
      capture: vi.fn(() => {
        throw new Error('recorder failed')
      }),
    }
    const gated = withConsent(inner, () => true)

    expect(() => gated.capture({ name: 'cta_clicked' })).not.toThrow()
  })
})
