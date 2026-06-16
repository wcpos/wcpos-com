/**
 * Per-provider sign-in attribution stored on the customer.
 *
 * Medusa returns only the Customer (+ its `metadata`) to the storefront — the
 * provider-specific AuthIdentity is backend-internal and never reaches
 * `/store/customers/me`. So the OAuth callback (which DOES know the provider)
 * records each linked provider in `customer.metadata.auth_providers`, and the
 * profile reads it here to show truthful connection state instead of assuming
 * Google for everyone.
 */

export type SignInProvider = 'google' | 'github' | 'discord'

// Stable display order; also the allow-list when reading persisted values.
const KNOWN_PROVIDERS: SignInProvider[] = ['google', 'github', 'discord']

const AVATAR_HOST_PROVIDERS: Array<[string, SignInProvider]> = [
  ['googleusercontent.com', 'google'],
  ['githubusercontent.com', 'github'],
  ['discordapp.com', 'discord'],
  ['cdn.discord', 'discord'],
]

/**
 * Legacy fallback: customers who signed in before `auth_providers` was
 * persisted still have an `oauth_avatar_url`; its host identifies the provider.
 */
function inferProviderFromAvatar(url: unknown): SignInProvider | null {
  if (typeof url !== 'string' || url.length === 0) return null
  for (const [host, provider] of AVATAR_HOST_PROVIDERS) {
    if (url.includes(host)) return provider
  }
  return null
}

/**
 * Providers the customer has actually signed in / linked with, from the
 * persisted `auth_providers` list, falling back to the avatar host for legacy
 * customers. Deduped and returned in stable order; empty means email/password
 * (or a provider we can't attribute yet).
 */
export function getLinkedAuthProviders(
  metadata: Record<string, unknown> | null | undefined
): SignInProvider[] {
  const linked = new Set<SignInProvider>()

  const raw = metadata?.auth_providers
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (
        typeof entry === 'string' &&
        (KNOWN_PROVIDERS as string[]).includes(entry)
      ) {
        linked.add(entry as SignInProvider)
      }
    }
  }

  if (linked.size === 0) {
    const inferred = inferProviderFromAvatar(metadata?.oauth_avatar_url)
    if (inferred) linked.add(inferred)
  }

  return KNOWN_PROVIDERS.filter((provider) => linked.has(provider))
}

/**
 * Append a provider to the persisted `auth_providers` list (deduped, stable
 * order preserved). Mirrors the discord/metadata.ts build helpers so the OAuth
 * callback can persist the provider alongside the avatar in one update.
 */
export function addAuthProviderToMetadata(
  metadata: Record<string, unknown> | null | undefined,
  provider: string
): Record<string, unknown> {
  const next = { ...(metadata ?? {}) }
  const existing = Array.isArray(next.auth_providers)
    ? next.auth_providers.filter(
        (entry): entry is string => typeof entry === 'string'
      )
    : []
  if (!existing.includes(provider)) existing.push(provider)
  next.auth_providers = existing
  return next
}
