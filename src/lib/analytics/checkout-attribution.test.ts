import { describe, expect, it } from 'vitest'
import {
  CHECKOUT_ATTRIBUTION_OWNER,
  buildCheckoutAttributionMetadata,
  parseCheckoutExperiment,
  parseCheckoutLocale,
  parseCheckoutVariant,
  parsePostHogSessionId,
} from './checkout-attribution'

const DISTINCT_ID = '550e8400-e29b-41d4-a716-446655440000'
const SESSION_ID = '01890f3e-8b3a-7cc2-98c4-dc0c0c0c0c0c'

describe('checkout attribution parsing', () => {
  it('accepts a PostHog UUID session ID', () => {
    expect(parsePostHogSessionId(SESSION_ID)).toBe(SESSION_ID)
  })

  it.each([
    undefined,
    null,
    42,
    {},
    '',
    'not-a-uuid',
    'buyer@example.com',
    'a'.repeat(257),
    `session\u0000id`,
  ])('rejects malformed PostHog session ID %j', (value) => {
    expect(parsePostHogSessionId(value)).toBeUndefined()
  })

  it.each([
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-11d4-a716-446655440000',
    '01890f3e-8b3a-7cc2-78c4-dc0c0c0c0c0c',
  ])('rejects non-v7 or invalid-variant session UUID %s', (value) => {
    expect(parsePostHogSessionId(value)).toBeUndefined()
  })

  it('canonicalizes supported locales through the locale helper', () => {
    expect(parseCheckoutLocale('fr-fr')).toBe('fr-FR')
  })

  it.each([undefined, 42, '', 'not a locale', 'ar-SA', 'fr-FR\u0000'])(
    'rejects unsupported or malformed locale %j',
    (value) => {
      expect(parseCheckoutLocale(value)).toBeUndefined()
    }
  )

  it('accepts only the checkout experiment and its known variants', () => {
    expect(parseCheckoutExperiment('pro_checkout_v1')).toBe('pro_checkout_v1')
    expect(parseCheckoutExperiment('other_experiment')).toBeUndefined()
    expect(parseCheckoutVariant('control')).toBe('control')
    expect(parseCheckoutVariant('value_copy')).toBe('value_copy')
    expect(parseCheckoutVariant('secret_variant')).toBeUndefined()
  })
})

describe('buildCheckoutAttributionMetadata', () => {
  it('builds the namespaced Medusa-owned attribution envelope', () => {
    expect(
      buildCheckoutAttributionMetadata({
        consentedDistinctId: DISTINCT_ID,
        sessionId: SESSION_ID,
        locale: 'fr-fr',
        experiment: 'pro_checkout_v1',
        variant: 'value_copy',
      })
    ).toEqual({
      wcpos_analytics: {
        completion_owner: 'medusa_v1',
        distinct_id: DISTINCT_ID,
        session_id: SESSION_ID,
        locale: 'fr-FR',
        experiment: 'pro_checkout_v1',
        variant: 'value_copy',
      },
    })
    expect(CHECKOUT_ATTRIBUTION_OWNER).toBe('medusa_v1')
  })

  it.each([
    undefined,
    '',
    'anon_123',
    'buyer@example.com',
    '550e8400-e29b-41d4-a716',
  ])('emits no envelope without a consented UUID distinct ID %j', (value) => {
    expect(
      buildCheckoutAttributionMetadata({ consentedDistinctId: value })
    ).toBeUndefined()
  })

  it.each([
    '01890f3e-8b3a-7cc2-98c4-dc0c0c0c0c0c',
    '550e8400-e29b-11d4-a716-446655440000',
    '550e8400-e29b-41d4-7716-446655440000',
  ])('emits no envelope for non-v4 or invalid-variant distinct UUID %s', (value) => {
    expect(
      buildCheckoutAttributionMetadata({ consentedDistinctId: value })
    ).toBeUndefined()
  })

  it('does not forward invalid optional context', () => {
    expect(
      buildCheckoutAttributionMetadata({
        consentedDistinctId: DISTINCT_ID,
        locale: 'private locale',
        experiment: 'secret_experiment',
        variant: 'secret_variant',
      })
    ).toEqual({
      wcpos_analytics: {
        completion_owner: CHECKOUT_ATTRIBUTION_OWNER,
        distinct_id: DISTINCT_ID,
      },
    })
  })

  it('rejects the envelope when a supplied session ID is malformed', () => {
    expect(
      buildCheckoutAttributionMetadata({
        consentedDistinctId: DISTINCT_ID,
        sessionId: 'buyer@example.com',
      })
    ).toBeUndefined()
  })
})
