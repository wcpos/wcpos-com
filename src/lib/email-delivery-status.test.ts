import { describe, expect, it } from 'vitest'
import { readEmailDeliveryFailure } from './email-delivery-status'

describe('readEmailDeliveryFailure', () => {
  it('reports an active failure with the bounced address', () => {
    expect(
      readEmailDeliveryFailure({
        email_delivery_failure: {
          active: true,
          email: 'info@layed3d.org.uk',
          template: 'license-created',
        },
      })
    ).toEqual({ email: 'info@layed3d.org.uk' })
  })

  it('projects only the address, never the operator detail', () => {
    // Bounce reason, template and timestamps are for the owner alert, not for
    // a page payload.
    const result = readEmailDeliveryFailure({
      email_delivery_failure: {
        active: true,
        email: 'a@b.test',
        template: 'reset-password',
        bounce_type: 'Permanent',
        bounce_sub_type: 'General',
        detected_at: '2026-08-22T00:00:00.000Z',
      },
    })

    expect(Object.keys(result ?? {})).toEqual(['email'])
  })

  it('reports nothing when the flag is absent, inactive, or malformed', () => {
    for (const metadata of [
      undefined,
      null,
      'nonsense',
      {},
      { email_delivery_failure: true },
      { email_delivery_failure: { active: false, email: 'a@b.test' } },
      { email_delivery_failure: { email: 'a@b.test' } },
    ]) {
      expect(readEmailDeliveryFailure(metadata)).toBeNull()
    }
  })

  it('still reports a failure that carries no address', () => {
    // The banner falls back to the customer's current address; suppressing the
    // warning because one field is missing would leave them unreachable and
    // uninformed.
    expect(
      readEmailDeliveryFailure({ email_delivery_failure: { active: true } })
    ).toEqual({ email: '' })
  })
})
