import 'server-only'
import { PostHog } from 'posthog-node'

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
    client = new PostHog(key, { host, flushAt: 1, flushInterval: 0 })
  }
  return client
}
