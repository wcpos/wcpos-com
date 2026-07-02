import 'server-only'
import { PostHog } from 'posthog-node'
import { deliver } from '@/lib/sinks/deliver'

let client: PostHog | null = null

/**
 * The only env keys this module reads. Narrower than NodeJS.ProcessEnv so the
 * function accepts partial env objects (e.g. in tests) and is honest about its
 * inputs. process.env satisfies this structurally.
 */
type PostHogServerEnv = {
  POSTHOG_API_KEY?: string
  NEXT_PUBLIC_POSTHOG_KEY?: string
  NEXT_PUBLIC_POSTHOG_HOST?: string
  // Index signature keeps process.env (NodeJS.ProcessEnv) structurally
  // assignable; without it TS rejects the all-optional "weak" type (TS2559).
  [key: string]: string | undefined
}

/**
 * Lazily build one process-wide PostHog server client. Returns null when no
 * key/host is configured so callers can no-op without branching on internals.
 * The server key (POSTHOG_API_KEY) is preferred; the public key is the fallback.
 */
export function getPostHogServerClient(env: PostHogServerEnv): PostHog | null {
  const key = env.POSTHOG_API_KEY ?? env.NEXT_PUBLIC_POSTHOG_KEY
  const host = env.NEXT_PUBLIC_POSTHOG_HOST
  if (!key || !host) return null
  if (!client) {
    client = new PostHog(key, {
      host,
      flushAt: 1,
      flushInterval: 0,
      // On Vercel the runtime freezes the moment the response returns, so the
      // capture POST the SDK fires internally is dropped mid-flight — the same
      // bug the log sinks had. The SDK registers its flush promise with the
      // request's waitUntil (looked up per-request by deliver) at enqueue
      // time, before the freeze.
      waitUntil: deliver,
      // waitUntil extends the *billed* function lifetime, so cap how long a
      // wedged PostHog can hold it open: one 3s attempt + one 3s retry.
      requestTimeout: 3000,
      fetchRetryCount: 1,
    })
  }
  return client
}
