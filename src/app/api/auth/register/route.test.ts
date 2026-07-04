import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'
import { AccountExistsError } from '@/lib/api/errors'
import { PASSWORD_TOO_SHORT_MESSAGE } from '@/lib/password-policy'

const mockRegister = vi.fn()
const mockSetAuthToken = vi.fn()
const { infoMock, errorMock } = vi.hoisted(() => ({
  infoMock: vi.fn(),
  errorMock: vi.fn(),
}))

vi.mock('@/lib/medusa-auth', () => ({
  register: (...args: unknown[]) => mockRegister(...args),
  setAuthToken: (...args: unknown[]) => mockSetAuthToken(...args),
}))
vi.mock('@/lib/logger', () => ({
  authLogger: { info: infoMock, error: errorMock },
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
    // Duplicate accounts are routine user behaviour — info, never error
    // (error level fans out to Discord alerts).
    expect(infoMock).toHaveBeenCalledTimes(1)
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('surfaces other registration failures as a 400 with the message and logs at error', async () => {
    mockRegister.mockRejectedValueOnce(new Error('Password is too weak'))

    const response = await postRegister({
      email: 'new@example.com',
      password: 'long-enough-but-weak',
    })
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toEqual({ error: 'Password is too weak' })
    expect(errorMock).toHaveBeenCalledTimes(1)
    expect(infoMock).not.toHaveBeenCalled()
  })

  it('rejects a request missing email or password with a 400', async () => {
    const response = await postRegister({ email: 'new@example.com' })
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toEqual({ error: 'Email and password are required' })
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('rejects a password shorter than the minimum with a 400 before hitting Medusa', async () => {
    const response = await postRegister({
      email: 'new@example.com',
      password: 'short',
    })
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toEqual({ error: PASSWORD_TOO_SHORT_MESSAGE })
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('accepts a password at exactly the minimum length', async () => {
    mockRegister.mockResolvedValueOnce({
      token: 'jwt',
      customer: { id: 'cus_1' },
    })

    const response = await postRegister({
      email: 'new@example.com',
      password: '12345678',
    })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json).toEqual({ success: true, customer: { id: 'cus_1' } })
    expect(mockRegister).toHaveBeenCalledTimes(1)
  })

  it('treats a malformed JSON body as a missing-fields 400, not a failure', async () => {
    const response = await POST(
      new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not-json',
      })
    )
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json).toEqual({ error: 'Email and password are required' })
    expect(mockRegister).not.toHaveBeenCalled()
    expect(errorMock).not.toHaveBeenCalled()
  })
})
