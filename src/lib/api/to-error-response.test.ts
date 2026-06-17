import { describe, it, expect } from 'vitest'
import { ApiError, AccountExistsError } from './errors'
import { toErrorResponse } from './to-error-response'

describe('toErrorResponse', () => {
  it('maps an ApiError with a code to { error, code } + its status', async () => {
    const res = toErrorResponse(
      new ApiError(409, 'Payment received, order pending', 'order_pending')
    )

    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({
      error: 'Payment received, order pending',
      code: 'order_pending',
    })
  })

  it('omits code from the body when the ApiError has none', async () => {
    const res = toErrorResponse(new ApiError(400, 'Cart ID is required'))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Cart ID is required' })
  })

  it('maps AccountExistsError to 409 + ACCOUNT_EXISTS', async () => {
    const res = toErrorResponse(new AccountExistsError())

    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({
      error: 'An account with this email already exists',
      code: 'ACCOUNT_EXISTS',
    })
  })

  it('preserves a custom AccountExistsError message', async () => {
    const res = toErrorResponse(
      new AccountExistsError('Identity with email already exists')
    )

    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({
      error: 'Identity with email already exists',
      code: 'ACCOUNT_EXISTS',
    })
  })

  it('maps an unknown Error to a generic 500 without leaking the message', async () => {
    const res = toErrorResponse(new Error('Postgres DSN postgres://secret@db'))

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Internal server error' })
  })

  it('maps a non-Error value to a generic 500', async () => {
    const res = toErrorResponse('boom')

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Internal server error' })
  })
})
