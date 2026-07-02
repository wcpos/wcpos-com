import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { fatalMock } = vi.hoisted(() => ({ fatalMock: vi.fn() }))
vi.mock('@/lib/logger', () => ({ saleLogger: { fatal: fatalMock } }))

import { GET } from './route'

describe('GET /api/debug/alert-test', () => {
  beforeEach(() => {
    fatalMock.mockReset()
    vi.unstubAllEnvs()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('fires a fatal and returns ok outside production', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const res = await GET(new Request('http://localhost/api/debug/alert-test'))
    expect(res.status).toBe(200)
    expect(fatalMock).toHaveBeenCalledTimes(1)
  })

  it('returns 404 in production without a matching token', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ALERT_TEST_TOKEN', 'secret')
    const res = await GET(new Request('http://localhost/api/debug/alert-test', {
      headers: { 'x-alert-test-token': 'wrong' },
    }))
    expect(res.status).toBe(404)
    expect(fatalMock).not.toHaveBeenCalled()
  })

  it('returns 404 in production when ALERT_TEST_TOKEN is empty, even for an empty header', async () => {
    // An env var saved as "" in the platform dashboard must fail closed —
    // "" === "" would otherwise bypass the guard.
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ALERT_TEST_TOKEN', '')
    const res = await GET(new Request('http://localhost/api/debug/alert-test', {
      headers: { 'x-alert-test-token': '' },
    }))
    expect(res.status).toBe(404)
    expect(fatalMock).not.toHaveBeenCalled()
  })

  it('returns 404 in production when ALERT_TEST_TOKEN is unset', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const res = await GET(new Request('http://localhost/api/debug/alert-test'))
    expect(res.status).toBe(404)
    expect(fatalMock).not.toHaveBeenCalled()
  })

  it('fires in production when the token matches', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ALERT_TEST_TOKEN', 'secret')
    const res = await GET(new Request('http://localhost/api/debug/alert-test', {
      headers: { 'x-alert-test-token': 'secret' },
    }))
    expect(res.status).toBe(200)
    expect(fatalMock).toHaveBeenCalledTimes(1)
  })
})
