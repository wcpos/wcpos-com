import { vi } from 'vitest'

/**
 * Stub the Vercel request-context global that `src/lib/sinks/deliver.ts`
 * reads. Returns the waitUntil spy and a restore() that must run in cleanup
 * so the global doesn't leak into other tests.
 */

const REQUEST_CONTEXT = Symbol.for('@vercel/request-context')

type GlobalWithContext = { [REQUEST_CONTEXT]?: unknown }

export function stubVercelRequestContext() {
  const waitUntil = vi.fn()
  ;(globalThis as GlobalWithContext)[REQUEST_CONTEXT] = {
    get: () => ({ waitUntil }),
  }
  return {
    waitUntil,
    restore() {
      delete (globalThis as GlobalWithContext)[REQUEST_CONTEXT]
    },
  }
}
