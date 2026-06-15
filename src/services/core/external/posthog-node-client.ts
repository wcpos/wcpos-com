import 'server-only'
import { PostHog } from 'posthog-node'

let client: PostHog | null = null

/**
 * Lazily build one process-wide PostHog server client. Returns null when no
 * key/host is configured so callers can no-op without branching on internals.
 * The server key (POSTHOG_API_KEY) is preferred; the public key is the fallback.
 */
export function getPostHogServerClient(env: NodeJS.ProcessEnv): PostHog | null {
  const key = env.POSTHOG_API_KEY ?? env.NEXT_PUBLIC_POSTHOG_KEY
  const host = env.NEXT_PUBLIC_POSTHOG_HOST
  if (!key || !host) return null
  if (!client) {
    client = new PostHog(key, { host, flushAt: 1, flushInterval: 0 })
  }
  return client
}
