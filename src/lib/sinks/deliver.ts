/**
 * Serverless-safe delivery for fire-and-forget requests (log sinks, server
 * analytics).
 *
 * On Vercel the function runtime is frozen the moment the response returns —
 * a floating `fetch` promise never completes, so alerts and logs are silently
 * dropped. Vercel exposes `waitUntil` through a request-context global;
 * registering the promise keeps the function alive until delivery settles.
 * Outside a Vercel request context (dev, tests, long-lived runtimes) this is
 * a no-op and the promise floats exactly as before.
 */

interface VercelRequestContext {
  waitUntil?: (promise: Promise<unknown>) => void
}

interface VercelRequestContextGlobal {
  get?: () => VercelRequestContext | undefined
}

const REQUEST_CONTEXT = Symbol.for('@vercel/request-context')

export function deliver(promise: Promise<unknown>): void {
  try {
    const holder = (
      globalThis as { [REQUEST_CONTEXT]?: VercelRequestContextGlobal }
    )[REQUEST_CONTEXT]
    holder?.get?.()?.waitUntil?.(promise)
  } catch {
    // No usable request context — the promise floats (dev/test/self-hosted).
  }
}
