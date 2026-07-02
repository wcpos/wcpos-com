import { describe, it, expect, afterEach } from 'vitest'
import { deliver } from './deliver'
import { stubVercelRequestContext } from '@/test/vercel-request-context'

const REQUEST_CONTEXT = Symbol.for('@vercel/request-context')

type GlobalWithContext = { [REQUEST_CONTEXT]?: unknown }

afterEach(() => {
  delete (globalThis as GlobalWithContext)[REQUEST_CONTEXT]
})

describe('deliver', () => {
  it('registers the promise with waitUntil when a Vercel request context exists', () => {
    const ctx = stubVercelRequestContext()

    const promise = Promise.resolve()
    deliver(promise)

    expect(ctx.waitUntil).toHaveBeenCalledTimes(1)
    expect(ctx.waitUntil).toHaveBeenCalledWith(promise)
  })

  it('is a no-op without a request context', () => {
    expect(() => deliver(Promise.resolve())).not.toThrow()
  })

  it('is a no-op when the context holder has no active context', () => {
    ;(globalThis as GlobalWithContext)[REQUEST_CONTEXT] = {
      get: () => undefined,
    }
    expect(() => deliver(Promise.resolve())).not.toThrow()
  })

  it('swallows a throwing context holder', () => {
    ;(globalThis as GlobalWithContext)[REQUEST_CONTEXT] = {
      get: () => {
        throw new Error('broken context')
      },
    }
    expect(() => deliver(Promise.resolve())).not.toThrow()
  })
})
