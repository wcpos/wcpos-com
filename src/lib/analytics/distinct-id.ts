export const ANALYTICS_DISTINCT_ID_COOKIE = 'wcpos-distinct-id'

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365

export function newDistinctId(): string {
  return crypto.randomUUID()
}

export function getDistinctIdCookieOptions() {
  return {
    path: '/',
    maxAge: ONE_YEAR_IN_SECONDS,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false,
  }
}
