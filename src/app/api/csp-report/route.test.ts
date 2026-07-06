import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted above module-scope consts, so the mock fns must be
// created inside vi.hoisted() to be available when the factory runs.
const { warnMock, consumeMock } = vi.hoisted(() => ({
  warnMock: vi.fn(),
  consumeMock: vi.fn(),
}))
vi.mock('@/lib/logger', () => ({
  infraLogger: { warn: warnMock },
}))
vi.mock('@/lib/rate-limit', () => ({
  createRateLimiter: () => ({ consume: (...args: unknown[]) => consumeMock(...args) }),
  clientIp: () => '1.2.3.4',
}))

import { POST } from './route'

function req(body: unknown, contentType = 'application/csp-report') {
  return new Request('http://localhost/api/csp-report', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function oversizedStreamingReq() {
  const encoder = new TextEncoder()
  let pulledPastOversize = false
  const body = new ReadableStream<Uint8Array>(
    {
      start(controller) {
        controller.enqueue(encoder.encode('x'.repeat(8_193)))
      },
      pull(controller) {
        pulledPastOversize = true
        controller.enqueue(
          encoder.encode(JSON.stringify({ 'csp-report': { 'violated-directive': 'script-src' } }))
        )
        controller.close()
      },
    },
    { highWaterMark: 0 }
  )

  const request = new Request('http://localhost/api/csp-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/csp-report' },
    body,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' })

  return { request, pulledPastOversize: () => pulledPastOversize }
}

// Concatenated tagged-template args (strings + interpolated values) for call N.
function loggedText(n = 0): string {
  return warnMock.mock.calls[n].flat().join('|')
}

describe('POST /api/csp-report', () => {
  beforeEach(() => {
    warnMock.mockReset()
    consumeMock.mockReset()
    consumeMock.mockResolvedValue({ success: true, remaining: 59 })
  })

  it('logs a legacy report-uri (application/csp-report) violation and returns 204', async () => {
    const res = await POST(
      req({
        'csp-report': {
          'document-uri': 'https://wcpos.com/pro',
          'violated-directive': 'script-src',
          'blocked-uri': 'https://evil.example/x.js',
        },
      })
    )
    expect(res.status).toBe(204)
    expect(warnMock).toHaveBeenCalledTimes(1)
    const text = loggedText()
    expect(text).toContain('script-src')
    expect(text).toContain('https://evil.example/x.js')
    expect(text).toContain('https://wcpos.com/pro')
  })

  it('logs each violation in a modern report-to (Reporting API) array', async () => {
    const res = await POST(
      req(
        [
          {
            type: 'csp-violation',
            body: {
              documentURL: 'https://wcpos.com/',
              effectiveDirective: 'connect-src',
              blockedURL: 'https://evil.example/beacon',
            },
          },
          { type: 'deprecation', body: {} },
          {
            type: 'csp-violation',
            body: { effectiveDirective: 'img-src', blockedURL: 'http://insecure/pic.png' },
          },
        ],
        'application/reports+json'
      )
    )
    expect(res.status).toBe(204)
    // Only the two csp-violation entries are logged; the deprecation is ignored.
    expect(warnMock).toHaveBeenCalledTimes(2)
    expect(loggedText(0)).toContain('connect-src')
    expect(loggedText(1)).toContain('img-src')
  })

  it('strips newlines/control chars from report fields (log-injection guard)', async () => {
    await POST(
      req({
        'csp-report': {
          'document-uri': 'https://wcpos.com/\n@everyone',
          'violated-directive': 'script-src',
          'blocked-uri': 'inline',
        },
      })
    )
    expect(warnMock).toHaveBeenCalledTimes(1)
    expect(loggedText()).not.toMatch(/[\r\n]/)
  })

  it('strips query strings and fragments from reported URLs before logging', async () => {
    await POST(
      req({
        'csp-report': {
          'document-uri': 'https://wcpos.com/reset-password?token=secret&email=user@example.com#frag',
          'violated-directive': 'script-src',
          'blocked-uri': 'https://evil.example/x.js?session=secret#frag',
        },
      })
    )
    expect(warnMock).toHaveBeenCalledTimes(1)
    const text = loggedText()
    expect(text).toContain('https://wcpos.com/reset-password')
    expect(text).toContain('https://evil.example/x.js')
    expect(text).not.toContain('token=secret')
    expect(text).not.toContain('email=user@example.com')
    expect(text).not.toContain('session=secret')
    expect(text).not.toContain('#frag')
  })

  it('caps logged violations from a modern batched report', async () => {
    const violations = Array.from({ length: 12 }, (_, i) => ({
      type: 'csp-violation',
      body: {
        effectiveDirective: `script-src-${i}`,
        blockedURL: `https://evil.example/${i}.js`,
      },
    }))

    const res = await POST(req(violations, 'application/reports+json'))

    expect(res.status).toBe(204)
    expect(warnMock).toHaveBeenCalledTimes(10)
    expect(loggedText(9)).toContain('script-src-9')
  })

  it('drops over-limit callers silently (204, no log)', async () => {
    consumeMock.mockResolvedValueOnce({ success: false, remaining: 0 })
    const res = await POST(
      req({ 'csp-report': { 'violated-directive': 'script-src', 'blocked-uri': 'x' } })
    )
    expect(res.status).toBe(204)
    expect(warnMock).not.toHaveBeenCalled()
  })

  it('tolerates malformed JSON', async () => {
    const res = await POST(req('{', 'application/csp-report'))
    expect(res.status).toBe(204)
    expect(warnMock).not.toHaveBeenCalled()
  })

  it('ignores an unrecognised payload shape without logging', async () => {
    const res = await POST(req({ hello: 'world' }))
    expect(res.status).toBe(204)
    expect(warnMock).not.toHaveBeenCalled()
  })

  it('drops payloads over the declared content-length cap', async () => {
    const big = new Request('http://localhost/api/csp-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/csp-report', 'content-length': '99999' },
      body: JSON.stringify({ 'csp-report': { 'blocked-uri': 'x'.repeat(50) } }),
    })
    const res = await POST(big)
    expect(res.status).toBe(204)
    expect(warnMock).not.toHaveBeenCalled()
  })

  it('stops reading an actually oversized streamed body after the byte cap', async () => {
    const { request, pulledPastOversize } = oversizedStreamingReq()

    const res = await POST(request)

    expect(res.status).toBe(204)
    expect(warnMock).not.toHaveBeenCalled()
    expect(pulledPastOversize()).toBe(false)
  })
})
