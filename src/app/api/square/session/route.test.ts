import { describe, expect, it, vi } from 'vitest'
const envState = vi.hoisted(() => ({
  SQUARE_CONNECT_CLIENT_ID: 'production-client-id',
  SQUARE_CONNECT_SANDBOX_CLIENT_ID: 'sandbox-client-id',
  SQUARE_CONNECT_STATE_SECRET: 's'.repeat(32),
}))
vi.mock('@/utils/env', () => ({ env: envState }))

import { POST } from './route'

function sessionRequest(environment: 'sandbox' | 'production') {
  return new Request('https://wcpos.com/api/square/session', {
    method: 'POST',
    body: JSON.stringify({
      callback_url: 'https://shop.example/square/callback',
      code_challenge: 'a'.repeat(43),
      environment,
    }),
  })
}

describe('POST /api/square/session', () => {
  it.each([
    ['production', 'production-client-id'],
    ['sandbox', 'sandbox-client-id'],
  ] as const)('uses the %s application ID', async (environment, clientId) => {
    const response = await POST(sessionRequest(environment))
    const body = (await response.json()) as { authorize_url: string }

    expect(new URL(body.authorize_url).searchParams.get('client_id')).toBe(clientId)
  })

  it('rejects sandbox authorization when only production is configured', async () => {
    envState.SQUARE_CONNECT_SANDBOX_CLIENT_ID = ''
    expect((await POST(sessionRequest('sandbox'))).status).toBe(503)
  })
})
