import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const mockRegister = vi.fn()
const mockSetAuthToken = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  register: (...args: unknown[]) => mockRegister(...args),
  setAuthToken: (...args: unknown[]) => mockSetAuthToken(...args),
}))

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a duplicate-account code when an account already exists', async () => {
    mockRegister.mockRejectedValueOnce(
      new Error('Identity with email already exists')
    )

    const response = await POST(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'password123',
        }),
      })
    )

    const json = await response.json()

    expect(response.status).toBe(409)
    expect(json.code).toBe('ACCOUNT_EXISTS')
  })
})
