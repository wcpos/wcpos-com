/**
 * OAuth providers supported for customer login.
 * Shared by the OAuth initiate and callback routes.
 */
export const ALLOWED_PROVIDERS: readonly string[] = ['google', 'github']

export function isAllowedOAuthProvider(
  provider: string,
  discordLoginEnabled: boolean
): boolean {
  return (
    ALLOWED_PROVIDERS.includes(provider) ||
    (discordLoginEnabled && provider === 'discord')
  )
}
