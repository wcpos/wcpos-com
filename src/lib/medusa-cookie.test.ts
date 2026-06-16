import { describe, expect, it } from 'vitest'
import { MEDUSA_TOKEN_COOKIE } from './medusa-cookie'

describe('MEDUSA_TOKEN_COOKIE', () => {
  it('is the medusa session cookie name', () => {
    // Locked: both the server module and the edge middleware read this exact
    // name. Changing it invalidates every existing session cookie.
    expect(MEDUSA_TOKEN_COOKIE).toBe('medusa-token')
  })
})
