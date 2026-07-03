import { describe, it, expect } from 'vitest'
import { stringifyLogPart } from './stringify-log-part'

describe('stringifyLogPart', () => {
  it('passes strings through untouched', () => {
    expect(stringifyLogPart('hello')).toBe('hello')
  })

  it('renders an Error with its message instead of {}', () => {
    const rendered = stringifyLogPart(new Error('Medusa OAuth initiate failed: 500'))
    expect(rendered).toContain('Medusa OAuth initiate failed: 500')
    expect(rendered).not.toBe('{}')
  })

  it('includes the stack when available', () => {
    const error = new Error('boom')
    expect(stringifyLogPart(error)).toContain('stringify-log-part.test')
  })

  it('falls back to name: message when the stack is missing', () => {
    const error = new Error('boom')
    error.stack = undefined
    expect(stringifyLogPart(error)).toBe('Error: boom')
  })

  it('renders the cause chain', () => {
    const cause = new Error('ECONNREFUSED')
    cause.stack = undefined
    const error = new Error('Failed to initiate OAuth', { cause })
    error.stack = undefined
    expect(stringifyLogPart(error)).toBe(
      'Error: Failed to initiate OAuth\nCaused by: Error: ECONNREFUSED'
    )
  })

  it('does not loop on a cyclic cause chain', () => {
    const a = new Error('a')
    const b = new Error('b', { cause: a })
    a.cause = b
    expect(() => stringifyLogPart(b)).not.toThrow()
  })

  it('renders non-Error cause values as JSON', () => {
    const error = new Error('request failed', {
      cause: { status: 500, body: 'unknown_error' },
    })
    error.stack = undefined
    expect(stringifyLogPart(error)).toBe(
      'Error: request failed\nCaused by: {"status":500,"body":"unknown_error"}'
    )
  })

  it('JSON-stringifies plain objects', () => {
    expect(stringifyLogPart({ a: 1 })).toBe('{"a":1}')
  })

  it('renders JSON-undefined values via String()', () => {
    expect(stringifyLogPart(undefined)).toBe('undefined')
  })

  it('never throws on unserializable values', () => {
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    expect(stringifyLogPart(cyclic)).toBe('[unserializable]')
  })
})
