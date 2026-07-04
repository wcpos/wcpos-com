import { describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { ANALYTICS_DISTINCT_ID_COOKIE } from '@/lib/analytics/distinct-id'
import { ANALYTICS_CONSENT_COOKIE } from '@/lib/analytics/consent'

vi.mock('next-intl/middleware', () => ({
  default: () => () => NextResponse.next(),
}))

import { middleware } from './middleware'

describe('middleware', () => {
  it('redirects updates.wcpos.com page requests to the main domain', () => {
    const request = new NextRequest('https://updates.wcpos.com/download', {
      headers: {
        host: 'updates.wcpos.com',
      },
    })

    const response = middleware(request)

    expect(response?.status).toBe(301)
    expect(response?.headers.get('location')).toBe('https://wcpos.com/download')
  })

  it('does not trust arbitrary hosts that merely contain updates.wcpos.com', () => {
    const request = new NextRequest('https://updates.wcpos.com.evil.test/download', {
      headers: {
        host: 'updates.wcpos.com.evil.test',
      },
    })

    const response = middleware(request)

    expect(response?.status).toBe(200)
    expect(response?.headers.get('location')).toBeNull()
  })

  it('bridges legacy WC API Manager licence calls to the compatibility shim', () => {
    const request = new NextRequest(
      'https://wcpos.com/?wc-api=am-software-api&request=activation&api_key=KEY&instance=site-1'
    )

    const response = middleware(request)

    const rewrite = response?.headers.get('x-middleware-rewrite')
    expect(rewrite).not.toBeNull()
    const rewriteUrl = new URL(rewrite as string)
    expect(rewriteUrl.pathname).toBe('/api/legacy/wc-am')
    // Query string (api_key, instance, request) is preserved for the handler.
    expect(rewriteUrl.searchParams.get('api_key')).toBe('KEY')
    expect(rewriteUrl.searchParams.get('request')).toBe('activation')
  })

  it('lets unauthenticated visitors reach checkout (account is created inline)', () => {
    const request = new NextRequest(
      'https://wcpos.com/pro/checkout?variant=variant_123'
    )

    const response = middleware(request)

    // No login redirect: the checkout's first step handles account
    // creation/sign-in; the cart APIs still enforce auth server-side.
    expect(response?.status).toBe(200)
    expect(response?.headers.get('location')).toBeNull()
    // No consent decision -> no analytics cookie
    expect(response?.cookies.get(ANALYTICS_DISTINCT_ID_COOKIE)).toBeUndefined()
  })

  it('still redirects unauthenticated account requests to login', () => {
    const request = new NextRequest('https://wcpos.com/account/licenses')

    const response = middleware(request)

    expect(response?.status).toBe(307)
    expect(response?.headers.get('location')).toBe(
      'https://wcpos.com/login?redirect=%2Faccount%2Flicenses'
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
    expect(response?.cookies.get(ANALYTICS_DISTINCT_ID_COOKIE)).toBeUndefined()
  })

  describe('analytics consent gating', () => {
    it('does not set a distinct-id cookie when no consent decision exists', () => {
      const request = new NextRequest('https://wcpos.com/')

      const response = middleware(request)

      expect(response?.cookies.get(ANALYTICS_DISTINCT_ID_COOKIE)).toBeUndefined()
    })

    it('does not refresh an existing distinct-id cookie without consent', () => {
      const request = new NextRequest('https://wcpos.com/', {
        headers: {
          cookie: `${ANALYTICS_DISTINCT_ID_COOKIE}=anon_legacy`,
        },
      })

      const response = middleware(request)

      expect(response?.cookies.get(ANALYTICS_DISTINCT_ID_COOKIE)).toBeUndefined()
    })

    it('sets a distinct-id cookie when consent is granted', () => {
      const request = new NextRequest('https://wcpos.com/', {
        headers: {
          cookie: `${ANALYTICS_CONSENT_COOKIE}=granted`,
        },
      })

      const response = middleware(request)

      expect(
        response?.cookies.get(ANALYTICS_DISTINCT_ID_COOKIE)?.value
      ).toBeTruthy()
    })

    it('keeps an existing distinct-id cookie when consent is granted', () => {
      const request = new NextRequest('https://wcpos.com/', {
        headers: {
          cookie: `${ANALYTICS_CONSENT_COOKIE}=granted; ${ANALYTICS_DISTINCT_ID_COOKIE}=anon_existing`,
        },
      })

      const response = middleware(request)

      // Cookie already present on the request -> not re-set on the response
      expect(response?.cookies.get(ANALYTICS_DISTINCT_ID_COOKIE)).toBeUndefined()
    })

    it('removes an existing distinct-id cookie when consent is denied', () => {
      const request = new NextRequest('https://wcpos.com/', {
        headers: {
          cookie: `${ANALYTICS_CONSENT_COOKIE}=denied; ${ANALYTICS_DISTINCT_ID_COOKIE}=anon_existing`,
        },
      })

      const response = middleware(request)

      const cleared = response?.cookies.get(ANALYTICS_DISTINCT_ID_COOKIE)
      expect(cleared?.value).toBe('')
      expect(cleared?.expires).toEqual(new Date(0))
    })

    it('does not set a distinct-id cookie when consent is denied', () => {
      const request = new NextRequest('https://wcpos.com/', {
        headers: {
          cookie: `${ANALYTICS_CONSENT_COOKIE}=denied`,
        },
      })

      const response = middleware(request)

      expect(response?.cookies.get(ANALYTICS_DISTINCT_ID_COOKIE)).toBeUndefined()
    })

    it('gates the distinct-id cookie on updates.wcpos.com redirects too', () => {
      const request = new NextRequest('https://updates.wcpos.com/download', {
        headers: {
          host: 'updates.wcpos.com',
          cookie: `${ANALYTICS_CONSENT_COOKIE}=granted`,
        },
      })

      const response = middleware(request)

      expect(response?.status).toBe(301)
      expect(
        response?.cookies.get(ANALYTICS_DISTINCT_ID_COOKIE)?.value
      ).toBeTruthy()
    })
  })
})
