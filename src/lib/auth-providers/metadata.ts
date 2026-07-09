/**
 * Per-provider sign-in attribution stored on the customer.
 *
 * Medusa returns only the Customer (+ its `metadata`) to the storefront — the
 * provider-specific AuthIdentity is backend-internal and never reaches
 * `/store/customers/me`. So the OAuth callback (which DOES know the provider)
 * records each linked provider in `customer.metadata.auth_providers` plus the
 * most recent one in `last_sign_in_provider`, and the profile reads them here
 * to show truthful connection state instead of assuming Google for everyone.
 */

export type SignInProvider = 'google' | 'github' | 'discord'

// Stable display order; also the allow-list for both reads and writes.
const KNOWN_PROVIDERS: SignInProvider[] = ['google', 'github', 'discord']

// Providers shown in the profile's sign-in row. Discord is surfaced by its own
// role-sync row, so it is intentionally excluded here.
type DisplaySignInProvider = 'google' | 'github'

function isKnownProvider(value: unknown): value is SignInProvider {
  return (
    typeof value === 'string' && (KNOWN_PROVIDERS as string[]).includes(value)
  )
}

function isDisplayProvider(value: unknown): value is DisplaySignInProvider {
  return value === 'google' || value === 'github'
}

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
      if (isKnownProvider(entry)) linked.add(entry)
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
 * order, allow-list validated on both the new value and existing entries so
 * invalid metadata can't accumulate). Unknown providers are ignored.
 */
export function addAuthProviderToMetadata(
  metadata: Record<string, unknown> | null | undefined,
  provider: string
): Record<string, unknown> {
  const next = { ...(metadata ?? {}) }
  if (!isKnownProvider(provider)) return next

  const existing = Array.isArray(next.auth_providers)
    ? next.auth_providers.filter(isKnownProvider)
    : []
  if (!existing.includes(provider)) existing.push(provider)
  next.auth_providers = existing
  return next
}

/**
 * Record a sign-in: add the provider to the linked set AND mark it as the most
 * recent one, so a customer linked to several providers attributes the sign-in
 * row to the provider they actually used this time. Unknown providers are
 * ignored. Mirrors the discord/metadata.ts build helpers.
 */
export function recordSignInProvider(
  metadata: Record<string, unknown> | null | undefined,
  provider: string
): Record<string, unknown> {
  const next = addAuthProviderToMetadata(metadata, provider)
  if (isKnownProvider(provider)) next.last_sign_in_provider = provider
  return next
}

/**
 * The provider to show in the profile sign-in row: the most recently used
 * Google/GitHub sign-in, else the first linked Google/GitHub, else null
 * (email/password, or only Discord — which has its own role-sync row).
 */
export function getPrimarySignInProvider(
  metadata: Record<string, unknown> | null | undefined
): DisplaySignInProvider | null {
  const last = metadata?.last_sign_in_provider
  if (isDisplayProvider(last)) return last

  return getLinkedAuthProviders(metadata).find(isDisplayProvider) ?? null
}

/**
 * Remove a disconnected provider from the persisted attribution so the
 * profile stops showing it as connected. `last_sign_in_provider` is
 * repointed to the first remaining provider (or nulled). The legacy
 * `oauth_avatar_url` fallback is also nulled when it attributes to the
 * removed provider, so `getLinkedAuthProviders` can't resurrect it.
 * Cleared keys are set to null (not deleted) so the result stays correct
 * whether Medusa merges or replaces the metadata object.
 */
export function removeAuthProviderFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
  provider: string
): Record<string, unknown> {
  const next = { ...(metadata ?? {}) }
  if (!isKnownProvider(provider)) return next

  const remaining = getLinkedAuthProviders(next).filter(
    (linked) => linked !== provider
  )
  next.auth_providers = remaining

  if (next.last_sign_in_provider === provider) {
    next.last_sign_in_provider = remaining[0] ?? null
  }

  if (inferProviderFromAvatar(next.oauth_avatar_url) === provider) {
    next.oauth_avatar_url = null
  }

  return next
}
