import { describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('next-intl/middleware', () => ({
  default: () => () => NextResponse.next(),
}))

import { middleware } from './middleware'

describe('middleware', () => {
  it('redirects unauthenticated checkout requests to login with redirect param', () => {
    const request = new NextRequest(
      'https://wcpos.com/pro/checkout?variant=variant_123'
    )

    const response = middleware(request)

    expect(response?.status).toBe(307)
    expect(response?.headers.get('location')).toBe(
      'https://wcpos.com/login?redirect=%2Fpro%2Fcheckout%3Fvariant%3Dvariant_123'
    )
  })

  it('allows checkout requests when the auth cookie is present', () => {
    const request = new NextRequest(
      'https://wcpos.com/pro/checkout?variant=variant_123',
      {
        headers: {
          cookie: 'medusa-token=test-token',
        },
      }
    )

    const response = middleware(request)

    expect(response?.status).toBe(200)
  })
})
