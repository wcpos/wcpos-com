import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'
import { AccountExistsError } from '@/lib/api/errors'

const mockRegister = vi.fn()
const mockSetAuthToken = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  register: (...args: unknown[]) => mockRegister(...args),
  setAuthToken: (...args: unknown[]) => mockSetAuthToken(...args),
}))

function postRegister(body: Record<string, unknown>) {
  return POST(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  )
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps AccountExistsError to a 409 with the ACCOUNT_EXISTS code', async () => {
    // register() classifies the duplicate at the Medusa seam and throws the
    // typed error; the route just delegates to the adapter.
    mockRegister.mockRejectedValueOnce(
      new AccountExistsError('Identity with email already exists')
    )

    const response = await postRegister({
      email: 'existing@example.com',
      password: 'password123',
    })
    const json = await response.json()

    expect(response.status).toBe(409)
    expect(json).toEqual({
      error: 'Identity with email already exists',
      code: 'ACCOUNT_EXISTS',
    })
  })

  it('surfaces other registration failures as a 400 with the message', async () => {
    mockRegister.mockRejectedValueOnce(new Error('Password is too weak'))

    const response = await postRegister({
      email: 'new@example.com',
      password: 'weak',
    })
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toEqual({ error: 'Password is too weak' })
  })

  it('rejects a request missing email or password with a 400', async () => {
    const response = await postRegister({ email: 'new@example.com' })
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toEqual({ error: 'Email and password are required' })
    expect(mockRegister).not.toHaveBeenCalled()
  })
})
