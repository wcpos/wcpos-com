export function getAnalyticsConfig(env: NodeJS.ProcessEnv) {
  const host = env.NEXT_PUBLIC_POSTHOG_HOST
  const key = env.NEXT_PUBLIC_POSTHOG_KEY

  return {
    enabled: Boolean(host && key),
    host,
    key,
    serverKey: env.POSTHOG_API_KEY,
  }
}
