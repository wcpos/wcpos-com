import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { ANALYTICS_DISTINCT_ID_COOKIE } from '@/lib/analytics/distinct-id'
import { ANALYTICS_CONSENT_COOKIE } from '@/lib/analytics/consent'

// Capture the request next-intl receives so tests can inspect the headers the
// middleware forwards to the RSC render path.
const intlRequests: NextRequest[] = []
vi.mock('next-intl/middleware', () => ({
  default: () => (request: NextRequest) => {
    intlRequests.push(request)
    return NextResponse.next()
  },
}))

const ACCOUNT_REQUEST_HEADER = 'x-wcpos-account-request'

import { config, middleware } from './middleware'

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

  it('keeps localized unauthenticated account redirects on the same locale', () => {
    const request = new NextRequest('https://wcpos.com/fr/account/licenses')

    const response = middleware(request)

    expect(response?.status).toBe(307)
    expect(response?.headers.get('location')).toBe(
      'https://wcpos.com/fr/login?redirect=%2Faccount%2Flicenses'
    )
  })

  it('keeps localized logged-in auth pages on the same locale', () => {
    const request = new NextRequest('https://wcpos.com/de/login', {
      headers: {
        cookie: 'medusa-token=test-token',
      },
    })

    const response = middleware(request)

    expect(response?.status).toBe(307)
    expect(response?.headers.get('location')).toBe('https://wcpos.com/de/account')
  })

  it('keeps default-locale logged-in auth redirects unprefixed', () => {
    const request = new NextRequest('https://wcpos.com/login', {
      headers: {
        cookie: 'medusa-token=test-token',
      },
    })

    const response = middleware(request)

    expect(response?.status).toBe(307)
    expect(response?.headers.get('location')).toBe('https://wcpos.com/account')
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

  describe('account-request header sanitization', () => {
    beforeEach(() => {
      intlRequests.length = 0
    })

    it('strips a client-supplied account-request header on non-account pages', () => {
      const request = new NextRequest('https://wcpos.com/', {
        headers: { [ACCOUNT_REQUEST_HEADER]: '1' },
      })

      middleware(request)

      // next-intl received the render request; the spoofed header is gone.
      expect(intlRequests).toHaveLength(1)
      expect(intlRequests[0].headers.get(ACCOUNT_REQUEST_HEADER)).toBeNull()
    })

    it('sets the account-request header on /account pages', () => {
      const request = new NextRequest('https://wcpos.com/account', {
        headers: {
          cookie: 'medusa-token=test-token',
          // Even a spoofed inbound value must be replaced (not trusted) with '1'.
          [ACCOUNT_REQUEST_HEADER]: 'spoofed',
        },
      })

      middleware(request)

      expect(intlRequests).toHaveLength(1)
      expect(intlRequests[0].headers.get(ACCOUNT_REQUEST_HEADER)).toBe('1')
    })

    it('strips a client-supplied account-request header on non-account API routes', () => {
      const request = new NextRequest('https://wcpos.com/api/legacy/wc-am', {
        headers: { [ACCOUNT_REQUEST_HEADER]: '1' },
      })

      const response = middleware(request)

      // The forwarded request headers (NextResponse.next({ request })) carry the
      // overwrite directive; the account-request header must not be among them.
      const overwrite = response?.headers.get('x-middleware-override-headers')
      expect(overwrite ?? '').not.toContain(ACCOUNT_REQUEST_HEADER)
      expect(
        response?.headers.get(`x-middleware-request-${ACCOUNT_REQUEST_HEADER}`)
      ).toBeNull()
    })

    it('sets the account-request header on /api/account API routes', () => {
      const request = new NextRequest('https://wcpos.com/api/account/impersonate', {
        headers: { [ACCOUNT_REQUEST_HEADER]: 'spoofed' },
      })

      const response = middleware(request)

      expect(
        response?.headers.get(`x-middleware-request-${ACCOUNT_REQUEST_HEADER}`)
      ).toBe('1')
    })

    it('sets the account-request header on store cart mutation API routes', () => {
      const request = new NextRequest('https://wcpos.com/api/store/cart/complete', {
        headers: { [ACCOUNT_REQUEST_HEADER]: 'spoofed' },
      })

      const response = middleware(request)

      expect(
        response?.headers.get(`x-middleware-request-${ACCOUNT_REQUEST_HEADER}`)
      ).toBe('1')
    })

    it('does not set the account-request header for account-prefixed page segments', () => {
      const request = new NextRequest('https://wcpos.com/accounting', {
        headers: {
          cookie: 'medusa-token=test-token',
          [ACCOUNT_REQUEST_HEADER]: 'spoofed',
        },
      })

      middleware(request)

      expect(intlRequests).toHaveLength(1)
      expect(intlRequests[0].headers.get(ACCOUNT_REQUEST_HEADER)).toBeNull()
    })

    it('strips the account-request header on legacy WC API Manager rewrites', () => {
      const request = new NextRequest(
        'https://wcpos.com/?wc-api=am-software-api&request=activation',
        { headers: { [ACCOUNT_REQUEST_HEADER]: '1' } }
      )

      const response = middleware(request)

      expect(
        response?.headers.get(`x-middleware-request-${ACCOUNT_REQUEST_HEADER}`)
      ).toBeNull()
    })

    it('strips the account-request header on updates API routes', () => {
      const request = new NextRequest('https://updates.wcpos.com/api/check', {
        headers: {
          host: 'updates.wcpos.com',
          [ACCOUNT_REQUEST_HEADER]: '1',
        },
      })

      const response = middleware(request)

      expect(
        response?.headers.get(`x-middleware-request-${ACCOUNT_REQUEST_HEADER}`)
      ).toBeNull()
    })
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

    it('honors a denial when a stale duplicate granted cookie also exists', () => {
      // Migration case: an existing visitor still carries the legacy host-scoped
      // `granted` alongside the shared `.wcpos.com` `denied`. The header reader
      // must reconcile fail-closed and remove the distinct-id cookie.
      const request = new NextRequest('https://wcpos.com/', {
        headers: {
          cookie: `${ANALYTICS_CONSENT_COOKIE}=granted; ${ANALYTICS_CONSENT_COOKIE}=denied; ${ANALYTICS_DISTINCT_ID_COOKIE}=anon_existing`,
        },
      })

      const response = middleware(request)

      const cleared = response?.cookies.get(ANALYTICS_DISTINCT_ID_COOKIE)
      expect(cleared?.value).toBe('')
      expect(cleared?.expires).toEqual(new Date(0))
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

describe('middleware matcher', () => {
  const runsOn = (pathname: string) =>
    config.matcher.some((pattern) => new RegExp(`^${pattern}$`).test(pathname))

  it('skips the Vercel collector routes served by the platform, not this app', () => {
    // Speed Insights and Web Analytics beacons are extension-less, so the
    // dot rule does not catch them; without an explicit bypass next-intl
    // rewrites them into localized pages and the measurements are lost.
    expect(runsOn('/_vercel/speed-insights/vitals')).toBe(false)
    expect(runsOn('/_vercel/speed-insights/script.js')).toBe(false)
    expect(runsOn('/_vercel/insights/event')).toBe(false)
    expect(runsOn('/_vercel/insights/script.js')).toBe(false)
  })

  it('skips Next.js internals and static files', () => {
    expect(runsOn('/_next/static/chunks/main.js')).toBe(false)
    expect(runsOn('/_next/image')).toBe(false)
    expect(runsOn('/favicon.ico')).toBe(false)
  })

  it('still runs on app pages, including locale-prefixed and account routes', () => {
    expect(runsOn('/')).toBe(true)
    expect(runsOn('/pro')).toBe(true)
    expect(runsOn('/fr/account/licences')).toBe(true)
  })
})
