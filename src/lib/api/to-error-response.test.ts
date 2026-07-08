import { describe, it, expect } from 'vitest'
import {
  ApiError,
  AccountExistsError,
  InvalidCredentialsError,
  InvalidResetTokenError,
} from './errors'
import { toErrorResponse } from './to-error-response'

describe('toErrorResponse', () => {
  it('maps an ApiError with a legacy code to { errorCode, code } + its status', async () => {
    const res = toErrorResponse(
      new ApiError(409, 'Payment received, order pending', 'order_pending')
    )

    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({
      errorCode: 'order_pending',
      code: 'order_pending',
    })
  })

  it('uses a generic stable errorCode when the ApiError has no specific code', async () => {
    const res = toErrorResponse(new ApiError(400, 'Cart ID is required'))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ errorCode: 'api_error' })
  })

  it('maps AccountExistsError to a translatable error code without exposing English text', async () => {
    const res = toErrorResponse(new AccountExistsError())

    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({
      errorCode: 'account_exists',
      code: 'ACCOUNT_EXISTS',
    })
  })

  it('keeps custom AccountExistsError details internal', async () => {
    const res = toErrorResponse(
      new AccountExistsError('Identity with email already exists')
    )

    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({
      errorCode: 'account_exists',
      code: 'ACCOUNT_EXISTS',
    })
  })

  it('maps auth classification errors to stable error codes', async () => {
    const invalidCredentials = toErrorResponse(new InvalidCredentialsError())
    const invalidResetToken = toErrorResponse(new InvalidResetTokenError())

    expect(invalidCredentials.status).toBe(401)
    expect(await invalidCredentials.json()).toEqual({ errorCode: 'invalid_credentials' })
    expect(invalidResetToken.status).toBe(401)
    expect(await invalidResetToken.json()).toEqual({ errorCode: 'invalid_reset_token' })
  })

  it('maps an unknown Error to a generic 500 without leaking the message', async () => {
    const res = toErrorResponse(new Error('Postgres DSN postgres://secret@db'))

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ errorCode: 'internal_server_error' })
  })

  it('maps a non-Error value to a generic 500', async () => {
    const res = toErrorResponse('boom')

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ errorCode: 'internal_server_error' })
  })
})
