# Discord Pro Role Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let WCPOS customers link their Discord account and automatically receive or lose the Discord `Pro User` role based on active Medusa/Keygen Pro entitlement.

**Architecture:** wcpos.com owns the linking UI, Discord OAuth callback, role-sync service, and scheduled reconciliation route. Medusa/Keygen remain the source of truth; Discord stores only the normal role projection. The Discord link is stored in Medusa customer metadata, never inferred from email.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Medusa Store/Admin APIs, Keygen CE, Discord OAuth2/API, Vercel Cron.

---

## Source Documents

- Issue: `https://github.com/wcpos/wcpos-com/issues/128`
- ADR: `docs/adr/0004-discord-pro-role-sync.md`
- Existing design sketch: `docs/plans/2026-06-10-discord-role-sync-design.md`
- Licensing vocabulary: `CONTEXT.md`

## Scope

### In scope

- Website-first Connect Discord flow from the account profile page.
- Discord-first `/link` command that returns an ephemeral wcpos.com linking URL.
- Optional `/status` command for self-service debugging.
- Customer metadata storage for the Discord link.
- Active-license-only entitlement helper.
- Bot-managed `Pro User` role add/remove.
- Daily reconciliation that sweeps linked customers and current role holders.
- Best-effort sync after checkout completion.
- Tests for security-critical and entitlement-critical behavior.

### Out of scope

- Discord Linked Roles / role connection metadata.
- Dedicated Medusa link table.
- Keygen webhook accelerator.
- Multi-guild support beyond keeping configuration isolated in env vars.
- Inferring identity from email.

## File Structure

### Create

- `src/lib/discord/metadata.ts` — typed helpers for reading/writing Discord link metadata on a Medusa customer.
- `src/lib/discord/state.ts` — signed short-lived OAuth/link state helpers.
- `src/lib/discord/oauth.ts` — Discord OAuth authorize URL, token exchange, and current-user fetch.
- `src/lib/discord/interactions.ts` — Discord interaction signature verification and response helpers.
- `src/services/core/external/discord-client.ts` — server-only Discord REST client for role/member operations.
- `src/services/core/external/medusa-admin-client.ts` — server-only admin reads needed by reconciliation.
- `src/services/core/business/discord-entitlement.ts` — active Pro entitlement helper.
- `src/services/core/business/discord-role-sync.ts` — targeted role sync and full reconciliation orchestration.
- `src/app/api/discord/link/route.ts` — authenticated website-first link starter.
- `src/app/api/discord/callback/route.ts` — Discord OAuth callback.
- `src/app/api/discord/disconnect/route.ts` — authenticated unlink endpoint.
- `src/app/api/discord/resync/route.ts` — authenticated manual resync endpoint.
- `src/app/api/discord/interactions/route.ts` — Discord slash command HTTP endpoint.
- `src/app/api/discord/reconcile/route.ts` — cron-protected reconciliation route.
- `src/components/account/discord-connect-card.tsx` — profile page card.
- Tests next to each new service/route.

### Modify

- `src/utils/env.ts` — add Discord/cron/Medusa admin env vars.
- `.env.example` — document new vars without secret values.
- `src/lib/medusa-auth.ts` — expose parameterized customer/order helpers if needed by sync code.
- `src/lib/customer-licenses.ts` — extract customer-parameterized license resolution.
- `src/app/[locale]/account/profile/page.tsx` — render Discord connect card.
- `src/app/api/store/cart/complete/route.ts` — fire-and-forget targeted sync after checkout.
- `package.json` — add a Discord signature verification helper dependency only if Node built-ins are not enough.
- `vercel.json` or project Vercel Cron settings — add daily cron if the repo already tracks Vercel cron in code.

## Implementation Rules

- Use a git worktree for implementation.
- Do not match by email.
- Never persist Discord OAuth access or refresh tokens.
- Avoid blocking checkout on Discord failures.
- Never remove roles during a customer-specific unverifiable/Keygen-outage result.
- Treat `Pro User` as bot-owned; reconciliation removes manual grants that are not backed by active entitlement.
- Run tests after each task and commit each coherent task.

---

## Task 1: Environment and metadata primitives

**Files:**
- Modify: `src/utils/env.ts`
- Modify: `.env.example`
- Create: `src/lib/discord/metadata.ts`
- Test: `src/lib/discord/metadata.test.ts`

- [ ] **Step 1: Add failing metadata tests**

Create `src/lib/discord/metadata.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  buildDiscordMetadataUpdate,
  clearDiscordMetadataUpdate,
  getDiscordLinkFromMetadata,
} from './metadata'

describe('discord metadata helpers', () => {
  it('reads a valid Discord link from flat customer metadata', () => {
    expect(
      getDiscordLinkFromMetadata({
        discord_user_id: '123',
        discord_username: 'paul',
        discord_avatar: 'abc',
        discord_linked_at: '2026-06-10T00:00:00.000Z',
        marketing_opt_in: true,
      })
    ).toEqual({
      userId: '123',
      username: 'paul',
      avatar: 'abc',
      linkedAt: '2026-06-10T00:00:00.000Z',
      lastSyncedAt: null,
    })
  })

  it('returns null when no Discord user id exists', () => {
    expect(getDiscordLinkFromMetadata({ discord_username: 'paul' })).toBeNull()
  })

  it('builds a metadata update without removing existing keys', () => {
    expect(
      buildDiscordMetadataUpdate(
        { marketing_opt_in: true },
        {
          userId: '123',
          username: 'paul',
          avatar: 'abc',
          linkedAt: '2026-06-10T00:00:00.000Z',
        }
      )
    ).toEqual({
      marketing_opt_in: true,
      discord_user_id: '123',
      discord_username: 'paul',
      discord_avatar: 'abc',
      discord_linked_at: '2026-06-10T00:00:00.000Z',
    })
  })

  it('clears Discord keys with empty strings for Medusa metadata deletion', () => {
    expect(clearDiscordMetadataUpdate({ marketing_opt_in: true })).toEqual({
      marketing_opt_in: true,
      discord_user_id: '',
      discord_username: '',
      discord_avatar: '',
      discord_linked_at: '',
      discord_last_synced_at: '',
    })
  })
})
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
pnpm vitest run src/lib/discord/metadata.test.ts
```

Expected: fails because `src/lib/discord/metadata.ts` does not exist.

- [ ] **Step 3: Implement metadata helpers**

Create `src/lib/discord/metadata.ts`:

```ts
export interface DiscordLinkMetadata {
  userId: string
  username: string | null
  avatar: string | null
  linkedAt: string
  lastSyncedAt: string | null
}

export interface DiscordLinkInput {
  userId: string
  username?: string | null
  avatar?: string | null
  linkedAt: string
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
}

export function getDiscordLinkFromMetadata(
  metadata: Record<string, unknown> | undefined
): DiscordLinkMetadata | null {
  const userId = stringOrNull(metadata?.discord_user_id)
  if (!userId) return null

  return {
    userId,
    username: stringOrNull(metadata?.discord_username),
    avatar: stringOrNull(metadata?.discord_avatar),
    linkedAt:
      stringOrNull(metadata?.discord_linked_at) ?? new Date(0).toISOString(),
    lastSyncedAt: stringOrNull(metadata?.discord_last_synced_at),
  }
}

export function buildDiscordMetadataUpdate(
  current: Record<string, unknown> | undefined,
  link: DiscordLinkInput
): Record<string, unknown> {
  return {
    ...(current ?? {}),
    discord_user_id: link.userId,
    discord_username: link.username ?? '',
    discord_avatar: link.avatar ?? '',
    discord_linked_at: link.linkedAt,
  }
}

export function markDiscordSyncedMetadataUpdate(
  current: Record<string, unknown> | undefined,
  syncedAt: string = new Date().toISOString()
): Record<string, unknown> {
  return {
    ...(current ?? {}),
    discord_last_synced_at: syncedAt,
  }
}

export function clearDiscordMetadataUpdate(
  current: Record<string, unknown> | undefined
): Record<string, unknown> {
  return {
    ...(current ?? {}),
    discord_user_id: '',
    discord_username: '',
    discord_avatar: '',
    discord_linked_at: '',
    discord_last_synced_at: '',
  }
}
```

- [ ] **Step 4: Add env vars**

Modify `src/utils/env.ts` inside `envSchema`:

```ts
  // Discord Pro role sync
  DISCORD_SYNC_ENABLED: z.string().optional(),
  DISCORD_GUILD_ID: z.string().optional(),
  DISCORD_PRO_ROLE_ID: z.string().optional(),
  DISCORD_BOT_TOKEN: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_PUBLIC_KEY: z.string().optional(),
  DISCORD_LINK_STATE_SECRET: z.string().optional(),
  CRON_SECRET: z.string().optional(),

  // Medusa Admin API for reconciliation sweeps
  MEDUSA_ADMIN_API_TOKEN: z.string().optional(),
```

Modify `.env.example`:

```env
# Discord Pro role sync (optional — disabled when DISCORD_SYNC_ENABLED is not true)
DISCORD_SYNC_ENABLED=
DISCORD_GUILD_ID=711884517081612298
DISCORD_PRO_ROLE_ID=
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_PUBLIC_KEY=
DISCORD_LINK_STATE_SECRET=
CRON_SECRET=

# Medusa Admin API (needed for Discord reconciliation)
MEDUSA_ADMIN_API_TOKEN=
```

- [ ] **Step 5: Run tests and commit**

Run:

```bash
pnpm vitest run src/lib/discord/metadata.test.ts
pnpm run type-check
```

Expected: metadata tests pass; type-check passes.

Commit:

```bash
git add src/utils/env.ts .env.example src/lib/discord/metadata.ts src/lib/discord/metadata.test.ts
git commit -m "feat(discord): add link metadata primitives"
```

---

## Task 2: Entitlement helper and customer-parameterized license resolution

**Files:**
- Modify: `src/lib/customer-licenses.ts`
- Modify: `src/lib/medusa-auth.ts`
- Create: `src/services/core/business/discord-entitlement.ts`
- Test: `src/services/core/business/discord-entitlement.test.ts`
- Test: `src/lib/customer-licenses.test.ts`

- [ ] **Step 1: Add entitlement tests**

Create `src/services/core/business/discord-entitlement.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { getDiscordEntitlementState, hasActiveProEntitlement } from './discord-entitlement'

const now = new Date('2026-06-10T12:00:00.000Z')

function license(status: string, expiry: string | null) {
  return { status, expiry }
}

describe('hasActiveProEntitlement', () => {
  it('grants for active lifetime licenses', () => {
    expect(hasActiveProEntitlement([license('ACTIVE', null)], now)).toBe(true)
  })

  it('grants for active yearly licenses before expiry', () => {
    expect(
      hasActiveProEntitlement(
        [license('active', '2026-07-01T00:00:00.000Z')],
        now
      )
    ).toBe(true)
  })

  it('does not grant for active licenses whose expiry is in the past', () => {
    expect(
      hasActiveProEntitlement(
        [license('active', '2026-06-01T00:00:00.000Z')],
        now
      )
    ).toBe(false)
  })

  it('does not grant for expired, suspended, revoked, or unknown statuses', () => {
    expect(
      hasActiveProEntitlement(
        [
          license('expired', '2026-01-01T00:00:00.000Z'),
          license('suspended', null),
          license('revoked', null),
          license('unknown', null),
        ],
        now
      )
    ).toBe(false)
  })

  it('marks unverifiable state when any license is unknown', () => {
    expect(getDiscordEntitlementState([license('unknown', null)], now)).toEqual({
      entitled: false,
      unverifiable: true,
      reason: 'unverifiable',
    })
  })
})
```

- [ ] **Step 2: Run failing test**

Run:

```bash
pnpm vitest run src/services/core/business/discord-entitlement.test.ts
```

Expected: fails because the file does not exist.

- [ ] **Step 3: Implement entitlement helper**

Create `src/services/core/business/discord-entitlement.ts`:

```ts
import 'server-only'

import type { LicenseDetail } from '@/types/license'

export type DiscordEntitlementInput = Pick<LicenseDetail, 'status' | 'expiry'>

export interface DiscordEntitlementState {
  entitled: boolean
  unverifiable: boolean
  reason: 'active' | 'inactive' | 'unverifiable'
}

function isActiveForDiscord(
  license: DiscordEntitlementInput,
  now: Date
): boolean {
  if (license.status.toLowerCase() !== 'active') return false
  if (!license.expiry) return true

  const expiry = new Date(license.expiry)
  if (Number.isNaN(expiry.getTime())) return false

  return expiry.getTime() >= now.getTime()
}

export function hasActiveProEntitlement(
  licenses: DiscordEntitlementInput[],
  now: Date = new Date()
): boolean {
  return licenses.some((license) => isActiveForDiscord(license, now))
}

export function getDiscordEntitlementState(
  licenses: DiscordEntitlementInput[],
  now: Date = new Date()
): DiscordEntitlementState {
  if (hasActiveProEntitlement(licenses, now)) {
    return { entitled: true, unverifiable: false, reason: 'active' }
  }

  const unverifiable = licenses.some(
    (license) => license.status.toLowerCase() === 'unknown'
  )

  if (unverifiable) {
    return { entitled: false, unverifiable: true, reason: 'unverifiable' }
  }

  return { entitled: false, unverifiable: false, reason: 'inactive' }
}
```

- [ ] **Step 4: Add parameterized order fetch helpers**

Modify `src/lib/medusa-auth.ts` to expose admin/customer-specific order fetches. Add types near existing types:

```ts
export interface MedusaCustomerOrderQuery {
  customerId: string
  limit?: number
  offset?: number
}
```

Add this function after `getAllCustomerOrders`:

```ts
export async function getCustomerOrdersByCustomerId({
  customerId,
  limit = 50,
  offset = 0,
}: MedusaCustomerOrderQuery): Promise<MedusaOrder[]> {
  const query = new URLSearchParams({
    customer_id: customerId,
    limit: String(limit),
    offset: String(offset),
  })

  const response = await fetch(
    `${env.MEDUSA_BACKEND_URL}/admin/orders?${query.toString()}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.MEDUSA_ADMIN_API_TOKEN ?? ''}`,
      },
    }
  )

  if (!response.ok) {
    const message = `Failed to get admin orders for customer ${customerId}: ${response.status}`
    authLogger.error`${message}`
    throw new Error(message)
  }

  const data = await response.json()
  return data.orders ?? []
}

export async function getAllCustomerOrdersByCustomerId(
  customerId: string,
  batchSize: number = 50,
  maxBatches: number = 20
): Promise<MedusaOrder[]> {
  const orders: MedusaOrder[] = []

  for (let batch = 0; batch < maxBatches; batch += 1) {
    const offset = batch * batchSize
    const page = await getCustomerOrdersByCustomerId({
      customerId,
      limit: batchSize,
      offset,
    })

    if (page.length === 0) break
    orders.push(...page)
    if (page.length < batchSize) break
  }

  return orders
}
```

If Medusa Admin API uses a different filter shape in the deployed backend, adjust only this helper and keep the rest of the sync code unchanged. Admin order-read failures must throw; they must never be converted to an empty order list because an empty list means “confirmed no licenses” and can demote a Discord role.

- [ ] **Step 5: Refactor license resolution**

Modify `src/lib/customer-licenses.ts`:

```ts
import type { LicenseDetail } from '@/types/license'
import {
  getAllCustomerOrders,
  getAllCustomerOrdersByCustomerId,
  getCustomer,
} from '@/lib/medusa-auth'
```

Change `resolveLicenseReference` so ID-resolved statuses are normalized too:

```ts
async function resolveLicenseReference(
  reference: LicenseReference
): Promise<LicenseDetail | null> {
  if (reference.id) {
    try {
      const license = await licenseClient.getLicenseWithMachines(reference.id)
      return { ...license, status: license.status.toLowerCase() }
    } catch (error) {
      licenseLogger.error`Failed to fetch license ${reference.id}: ${error}`
    }
  }

  if (reference.key) {
    try {
      const validation = await licenseClient.validateLicenseKey(reference.key)
      if (validation.license) {
        return {
          ...validation.license,
          status: validation.license.status.toLowerCase(),
          machines: [],
        }
      }
    } catch (error) {
      licenseLogger.error`Failed to validate license key: ${error}`
    }
  }

  return buildLicensePlaceholder(reference)
}
```

Add:

```ts
async function resolveLicensesFromOrders(orders: Awaited<ReturnType<typeof getAllCustomerOrders>>) {
  const references = extractLicenseReferencesFromOrders(orders)
  const licenses = await Promise.all(
    references.map((reference) => resolveLicenseReference(reference))
  )

  return licenses.filter((license): license is LicenseDetail => Boolean(license))
}

export async function getResolvedLicensesForCustomerId(
  customerId: string
): Promise<LicenseDetail[]> {
  const orders = await getAllCustomerOrdersByCustomerId(customerId)
  return resolveLicensesFromOrders(orders)
}
```

Update `getResolvedCustomerLicenses` to call `resolveLicensesFromOrders`:

```ts
export async function getResolvedCustomerLicenses(): Promise<{
  authenticated: boolean
  licenses: LicenseDetail[]
}> {
  const customer = await getCustomer()
  if (!customer) {
    return { authenticated: false, licenses: [] }
  }

  const orders = await getAllCustomerOrders()

  return {
    authenticated: true,
    licenses: await resolveLicensesFromOrders(orders),
  }
}
```

- [ ] **Step 6: Add regression test for status normalization**

Add to `src/lib/customer-licenses.test.ts`:

```ts
  it('normalizes status from id-resolved licenses', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1' })
    mockGetAllCustomerOrders.mockResolvedValueOnce([
      {
        id: 'order_1',
        status: 'completed',
        display_id: 1,
        email: 'user@example.com',
        currency_code: 'usd',
        total: 129,
        subtotal: 129,
        tax_total: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        items: [],
        metadata: { licenses: [{ license_id: 'lic_1' }] },
      },
    ])
    mockGetLicenseWithMachines.mockResolvedValueOnce({
      id: 'lic_1',
      key: 'WCPOS-AAAA-1111',
      status: 'ACTIVE',
      expiry: null,
      maxMachines: 1,
      machines: [],
      metadata: {},
      policyId: 'policy_1',
      createdAt: '2026-01-01T00:00:00Z',
    })

    const result = await getResolvedCustomerLicenses()

    expect(result.licenses[0].status).toBe('active')
  })
```

- [ ] **Step 7: Run tests and commit**

Run:

```bash
pnpm vitest run src/services/core/business/discord-entitlement.test.ts src/lib/customer-licenses.test.ts
pnpm run type-check
```

Expected: tests and type-check pass.

Commit:

```bash
git add src/lib/medusa-auth.ts src/lib/customer-licenses.ts src/lib/customer-licenses.test.ts src/services/core/business/discord-entitlement.ts src/services/core/business/discord-entitlement.test.ts
git commit -m "feat(discord): derive Pro role entitlement from licenses"
```

---

## Task 3: Discord OAuth and signed link state

**Files:**
- Create: `src/lib/discord/state.ts`
- Create: `src/lib/discord/oauth.ts`
- Test: `src/lib/discord/state.test.ts`
- Test: `src/lib/discord/oauth.test.ts`

- [ ] **Step 1: Add signed state tests**

Create `src/lib/discord/state.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createDiscordState, verifyDiscordState } from './state'

const secret = 'test-secret-test-secret-test-secret'

describe('Discord link state', () => {
  it('round-trips website-first state', () => {
    const state = createDiscordState({ customerId: 'cust_1' }, secret, new Date('2026-06-10T00:00:00Z'))
    expect(verifyDiscordState(state, secret, new Date('2026-06-10T00:05:00Z'))).toEqual({
      customerId: 'cust_1',
      expectedDiscordUserId: null,
    })
  })

  it('round-trips Discord-first state with expected user', () => {
    const state = createDiscordState(
      { customerId: 'cust_1', expectedDiscordUserId: '123' },
      secret,
      new Date('2026-06-10T00:00:00Z')
    )
    expect(verifyDiscordState(state, secret, new Date('2026-06-10T00:01:00Z'))).toEqual({
      customerId: 'cust_1',
      expectedDiscordUserId: '123',
    })
  })

  it('rejects expired state', () => {
    const state = createDiscordState({ customerId: 'cust_1' }, secret, new Date('2026-06-10T00:00:00Z'))
    expect(() =>
      verifyDiscordState(state, secret, new Date('2026-06-10T00:16:00Z'))
    ).toThrow('Discord link state expired')
  })

  it('rejects tampered state', () => {
    const state = createDiscordState({ customerId: 'cust_1' }, secret, new Date('2026-06-10T00:00:00Z'))
    expect(() => verifyDiscordState(`${state}x`, secret, new Date('2026-06-10T00:01:00Z'))).toThrow('Invalid Discord link state')
  })
})
```

- [ ] **Step 2: Implement signed state**

Create `src/lib/discord/state.ts`:

```ts
import { createHmac, timingSafeEqual } from 'node:crypto'

interface StatePayload {
  customerId: string
  expectedDiscordUserId?: string | null
  issuedAt: string
}

export interface VerifiedDiscordState {
  customerId: string
  expectedDiscordUserId: string | null
}

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function decode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function createDiscordState(
  input: { customerId: string; expectedDiscordUserId?: string | null },
  secret: string,
  now: Date = new Date()
): string {
  const payload: StatePayload = {
    customerId: input.customerId,
    expectedDiscordUserId: input.expectedDiscordUserId ?? null,
    issuedAt: now.toISOString(),
  }
  const encoded = encode(JSON.stringify(payload))
  return `${encoded}.${sign(encoded, secret)}`
}

export function verifyDiscordState(
  state: string,
  secret: string,
  now: Date = new Date()
): VerifiedDiscordState {
  const [encoded, signature] = state.split('.')
  if (!encoded || !signature) throw new Error('Invalid Discord link state')

  const expected = sign(encoded, secret)
  const valid =
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected))

  if (!valid) throw new Error('Invalid Discord link state')

  const payload = JSON.parse(decode(encoded)) as StatePayload
  const issuedAt = new Date(payload.issuedAt)
  if (Number.isNaN(issuedAt.getTime())) throw new Error('Invalid Discord link state')

  const ageMs = now.getTime() - issuedAt.getTime()
  if (ageMs < 0 || ageMs > 15 * 60 * 1000) {
    throw new Error('Discord link state expired')
  }

  return {
    customerId: payload.customerId,
    expectedDiscordUserId: payload.expectedDiscordUserId ?? null,
  }
}
```

- [ ] **Step 3: Add OAuth tests**

Create `src/lib/discord/oauth.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildDiscordAuthorizeUrl } from './oauth'

describe('buildDiscordAuthorizeUrl', () => {
  it('builds identify-only authorization URL', () => {
    const url = new URL(
      buildDiscordAuthorizeUrl({
        clientId: 'client_1',
        redirectUri: 'https://wcpos.com/api/discord/callback',
        state: 'state_1',
      })
    )

    expect(url.origin).toBe('https://discord.com')
    expect(url.pathname).toBe('/oauth2/authorize')
    expect(url.searchParams.get('client_id')).toBe('client_1')
    expect(url.searchParams.get('redirect_uri')).toBe('https://wcpos.com/api/discord/callback')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('scope')).toBe('identify')
    expect(url.searchParams.get('state')).toBe('state_1')
  })
})
```

- [ ] **Step 4: Implement OAuth helper**

Create `src/lib/discord/oauth.ts`:

```ts
import 'server-only'

export interface DiscordOAuthUser {
  id: string
  username: string
  avatar: string | null
}

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
}

export function buildDiscordAuthorizeUrl({
  clientId,
  redirectUri,
  state,
}: {
  clientId: string
  redirectUri: string
  state: string
}): string {
  const url = new URL('https://discord.com/oauth2/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'identify')
  url.searchParams.set('state', state)
  return url.toString()
}

export async function exchangeDiscordCode({
  code,
  clientId,
  clientSecret,
  redirectUri,
}: {
  code: string
  clientId: string
  clientSecret: string
  redirectUri: string
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  })

  const response = await fetch('https://discord.com/api/v10/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body,
  })

  if (!response.ok) {
    throw new Error(`Discord token exchange failed: ${response.status}`)
  }

  return response.json()
}

export async function fetchDiscordCurrentUser(
  accessToken: string
): Promise<DiscordOAuthUser> {
  const response = await fetch('https://discord.com/api/v10/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Discord user fetch failed: ${response.status}`)
  }

  const data = await response.json()
  return {
    id: data.id,
    username: data.global_name ?? data.username,
    avatar: data.avatar ?? null,
  }
}
```

- [ ] **Step 5: Run tests and commit**

Run:

```bash
pnpm vitest run src/lib/discord/state.test.ts src/lib/discord/oauth.test.ts
pnpm run type-check
```

Commit:

```bash
git add src/lib/discord/state.ts src/lib/discord/state.test.ts src/lib/discord/oauth.ts src/lib/discord/oauth.test.ts
git commit -m "feat(discord): add OAuth link state helpers"
```

---

## Task 4: Discord REST client and targeted role sync service

**Files:**
- Create: `src/services/core/external/discord-client.ts`
- Create: `src/services/core/business/discord-role-sync.ts`
- Test: `src/services/core/external/discord-client.test.ts`
- Test: `src/services/core/business/discord-role-sync.test.ts`

- [ ] **Step 1: Add Discord client tests**

Create `src/services/core/external/discord-client.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDiscordClient } from './discord-client'

describe('discord client', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('adds a guild role with bot auth', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(null, { status: 204 }))
    const client = createDiscordClient({ botToken: 'bot_token' })

    await client.addRole({ guildId: 'guild_1', userId: 'user_1', roleId: 'role_1', reason: 'test' })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://discord.com/api/v10/guilds/guild_1/members/user_1/roles/role_1',
      expect.objectContaining({ method: 'PUT', headers: expect.objectContaining({ Authorization: 'Bot bot_token' }) })
    )
  })

  it('treats unknown member as missing instead of throwing', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Unknown Member' }), { status: 404 }))
    const client = createDiscordClient({ botToken: 'bot_token' })

    await expect(client.addRole({ guildId: 'guild_1', userId: 'missing', roleId: 'role_1' })).resolves.toEqual({ ok: false, missingMember: true })
  })
})
```

- [ ] **Step 2: Implement Discord REST client**

Create `src/services/core/external/discord-client.ts`:

```ts
import 'server-only'

const DISCORD_API = 'https://discord.com/api/v10'

export interface DiscordRoleMutationResult {
  ok: boolean
  missingMember: boolean
  skipped: boolean
}

interface DiscordClientConfig {
  botToken: string | undefined
  enabled?: boolean
}

async function requestWithRetry(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, init)
    if (response.status !== 429 && response.status < 500) return response

    const retryAfter = Number(response.headers.get('retry-after') ?? '0')
    const delayMs = retryAfter > 0 ? retryAfter * 1000 : 500 * (attempt + 1)
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  return fetch(url, init)
}

export function createDiscordClient(config: DiscordClientConfig) {
  const enabled = config.enabled ?? true

  function headers(reason?: string): HeadersInit {
    const value: Record<string, string> = {
      Authorization: `Bot ${config.botToken ?? ''}`,
    }
    if (reason) value['X-Audit-Log-Reason'] = reason
    return value
  }

  async function mutateRole(
    method: 'PUT' | 'DELETE',
    input: { guildId: string; userId: string; roleId: string; reason?: string }
  ): Promise<DiscordRoleMutationResult> {
    if (!enabled || !config.botToken) {
      return { ok: false, missingMember: false, skipped: true }
    }

    const response = await requestWithRetry(
      `${DISCORD_API}/guilds/${input.guildId}/members/${input.userId}/roles/${input.roleId}`,
      { method, headers: headers(input.reason) }
    )

    if (response.status === 204) {
      return { ok: true, missingMember: false, skipped: false }
    }

    if (response.status === 404) {
      return { ok: false, missingMember: true, skipped: false }
    }

    throw new Error(`Discord ${method} role failed: ${response.status} ${await response.text()}`)
  }

  return {
    addRole: (input: { guildId: string; userId: string; roleId: string; reason?: string }) =>
      mutateRole('PUT', input),
    removeRole: (input: { guildId: string; userId: string; roleId: string; reason?: string }) =>
      mutateRole('DELETE', input),
    async getMember(input: { guildId: string; userId: string }): Promise<{ userId: string; roles: string[] } | null> {
      if (!enabled || !config.botToken) return null
      const response = await requestWithRetry(`${DISCORD_API}/guilds/${input.guildId}/members/${input.userId}`, {
        headers: headers(),
      })
      if (response.status === 404) return null
      if (!response.ok) throw new Error(`Discord get member failed: ${response.status}`)
      const data = await response.json()
      return { userId: data.user.id, roles: data.roles ?? [] }
    },
    async listMembers(input: { guildId: string; after?: string; limit?: number }): Promise<Array<{ userId: string; roles: string[] }>> {
      if (!enabled || !config.botToken) return []
      const url = new URL(`${DISCORD_API}/guilds/${input.guildId}/members`)
      url.searchParams.set('limit', String(input.limit ?? 1000))
      if (input.after) url.searchParams.set('after', input.after)
      const response = await requestWithRetry(url.toString(), { headers: headers() })
      if (!response.ok) throw new Error(`Discord list members failed: ${response.status}`)
      const data = await response.json()
      return data.map((member: { user: { id: string }; roles?: string[] }) => ({
        userId: member.user.id,
        roles: member.roles ?? [],
      }))
    },
  }
}

export type DiscordClient = ReturnType<typeof createDiscordClient>
```

- [ ] **Step 3: Add role sync tests**

Create `src/services/core/business/discord-role-sync.test.ts` with mocked dependencies:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetResolvedLicensesForCustomerId = vi.fn()
const mockUpdateCustomerById = vi.fn()
const mockGetMember = vi.fn()
const mockAddRole = vi.fn()
const mockRemoveRole = vi.fn()

vi.mock('@/lib/customer-licenses', () => ({
  getResolvedLicensesForCustomerId: (...args: unknown[]) => mockGetResolvedLicensesForCustomerId(...args),
}))

vi.mock('@/services/core/external/medusa-admin-client', () => ({
  updateCustomerMetadataById: (...args: unknown[]) => mockUpdateCustomerById(...args),
}))

vi.mock('@/services/core/external/discord-client', () => ({
  createDiscordClient: () => ({
    getMember: (...args: unknown[]) => mockGetMember(...args),
    addRole: (...args: unknown[]) => mockAddRole(...args),
    removeRole: (...args: unknown[]) => mockRemoveRole(...args),
  }),
}))

import { syncDiscordRoleForCustomer } from './discord-role-sync'

describe('syncDiscordRoleForCustomer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('adds Pro User when customer has active entitlement', async () => {
    mockGetResolvedLicensesForCustomerId.mockResolvedValueOnce([{ status: 'active', expiry: null }])
    mockGetMember.mockResolvedValueOnce({ userId: 'discord_1', roles: [] })
    mockAddRole.mockResolvedValueOnce({ ok: true, missingMember: false, skipped: false })

    const result = await syncDiscordRoleForCustomer({
      customerId: 'cust_1',
      metadata: { discord_user_id: 'discord_1' },
      guildId: 'guild_1',
      roleId: 'role_1',
      enabled: true,
      botToken: 'bot_token',
    })

    expect(result.action).toBe('added')
    expect(mockAddRole).toHaveBeenCalledWith(expect.objectContaining({ userId: 'discord_1', roleId: 'role_1' }))
  })

  it('removes Pro User when entitlement is inactive', async () => {
    mockGetResolvedLicensesForCustomerId.mockResolvedValueOnce([{ status: 'expired', expiry: '2026-01-01T00:00:00Z' }])
    mockGetMember.mockResolvedValueOnce({ userId: 'discord_1', roles: ['role_1'] })
    mockRemoveRole.mockResolvedValueOnce({ ok: true, missingMember: false, skipped: false })

    const result = await syncDiscordRoleForCustomer({
      customerId: 'cust_1',
      metadata: { discord_user_id: 'discord_1' },
      guildId: 'guild_1',
      roleId: 'role_1',
      enabled: true,
      botToken: 'bot_token',
    })

    expect(result.action).toBe('removed')
  })

  it('does not remove during unverifiable license state', async () => {
    mockGetResolvedLicensesForCustomerId.mockResolvedValueOnce([{ status: 'unknown', expiry: null }])
    mockGetMember.mockResolvedValueOnce({ userId: 'discord_1', roles: ['role_1'] })

    const result = await syncDiscordRoleForCustomer({
      customerId: 'cust_1',
      metadata: { discord_user_id: 'discord_1' },
      guildId: 'guild_1',
      roleId: 'role_1',
      enabled: true,
      botToken: 'bot_token',
    })

    expect(result.action).toBe('skipped_unverifiable')
    expect(mockRemoveRole).not.toHaveBeenCalled()
  })


  it('does not remove when customer license resolution fails', async () => {
    mockGetResolvedLicensesForCustomerId.mockRejectedValueOnce(new Error('Medusa unavailable'))
    mockGetMember.mockResolvedValueOnce({ userId: 'discord_1', roles: ['role_1'] })

    const result = await syncDiscordRoleForCustomer({
      customerId: 'cust_1',
      metadata: { discord_user_id: 'discord_1' },
      guildId: 'guild_1',
      roleId: 'role_1',
      enabled: true,
      botToken: 'bot_token',
    })

    expect(result.action).toBe('skipped_unverifiable')
    expect(mockRemoveRole).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 4: Implement role sync service**

Create `src/services/core/business/discord-role-sync.ts`:

```ts
import 'server-only'

import { getResolvedLicensesForCustomerId } from '@/lib/customer-licenses'
import { getDiscordLinkFromMetadata, markDiscordSyncedMetadataUpdate } from '@/lib/discord/metadata'
import { createDiscordClient } from '@/services/core/external/discord-client'
import { updateCustomerMetadataById } from '@/services/core/external/medusa-admin-client'
import { getDiscordEntitlementState } from './discord-entitlement'

export type DiscordSyncAction =
  | 'added'
  | 'removed'
  | 'already_correct'
  | 'missing_link'
  | 'missing_member'
  | 'skipped_unverifiable'
  | 'disabled'

export interface SyncDiscordRoleInput {
  customerId: string
  metadata: Record<string, unknown> | undefined
  guildId: string | undefined
  roleId: string | undefined
  botToken: string | undefined
  enabled: boolean
}

export interface SyncDiscordRoleResult {
  customerId: string
  discordUserId: string | null
  action: DiscordSyncAction
}

export async function syncDiscordRoleForCustomer(
  input: SyncDiscordRoleInput
): Promise<SyncDiscordRoleResult> {
  if (!input.enabled || !input.guildId || !input.roleId || !input.botToken) {
    return { customerId: input.customerId, discordUserId: null, action: 'disabled' }
  }

  const link = getDiscordLinkFromMetadata(input.metadata)
  if (!link) {
    return { customerId: input.customerId, discordUserId: null, action: 'missing_link' }
  }

  const discord = createDiscordClient({ botToken: input.botToken, enabled: input.enabled })
  const member = await discord.getMember({ guildId: input.guildId, userId: link.userId })
  if (!member) {
    return { customerId: input.customerId, discordUserId: link.userId, action: 'missing_member' }
  }

  let entitlement: ReturnType<typeof getDiscordEntitlementState>
  try {
    const licenses = await getResolvedLicensesForCustomerId(input.customerId)
    entitlement = getDiscordEntitlementState(licenses)
  } catch {
    return { customerId: input.customerId, discordUserId: link.userId, action: 'skipped_unverifiable' }
  }

  const hasRole = member.roles.includes(input.roleId)

  if (entitlement.entitled && !hasRole) {
    await discord.addRole({
      guildId: input.guildId,
      userId: link.userId,
      roleId: input.roleId,
      reason: 'WCPOS active Pro entitlement',
    })
    await updateCustomerMetadataById(input.customerId, markDiscordSyncedMetadataUpdate(input.metadata))
    return { customerId: input.customerId, discordUserId: link.userId, action: 'added' }
  }

  if (!entitlement.entitled && hasRole) {
    if (entitlement.unverifiable) {
      return { customerId: input.customerId, discordUserId: link.userId, action: 'skipped_unverifiable' }
    }

    await discord.removeRole({
      guildId: input.guildId,
      userId: link.userId,
      roleId: input.roleId,
      reason: 'WCPOS Pro entitlement inactive',
    })
    await updateCustomerMetadataById(input.customerId, markDiscordSyncedMetadataUpdate(input.metadata))
    return { customerId: input.customerId, discordUserId: link.userId, action: 'removed' }
  }

  await updateCustomerMetadataById(input.customerId, markDiscordSyncedMetadataUpdate(input.metadata))
  return { customerId: input.customerId, discordUserId: link.userId, action: 'already_correct' }
}
```

- [ ] **Step 5: Add Medusa admin metadata writer**

Create `src/services/core/external/medusa-admin-client.ts`:

```ts
import 'server-only'

import { env } from '@/utils/env'
import { authLogger, storeLogger } from '@/lib/logger'
import type { MedusaCustomer } from '@/lib/medusa-auth'

function adminHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env.MEDUSA_ADMIN_API_TOKEN ?? ''}`,
  }
}

export async function updateCustomerMetadataById(
  customerId: string,
  metadata: Record<string, unknown>
): Promise<MedusaCustomer | null> {
  if (!env.MEDUSA_ADMIN_API_TOKEN) {
    storeLogger.warn`MEDUSA_ADMIN_API_TOKEN missing; cannot update customer metadata`
    return null
  }

  const response = await fetch(`${env.MEDUSA_BACKEND_URL}/admin/customers/${customerId}`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ metadata }),
  })

  if (!response.ok) {
    authLogger.error`Failed to update customer metadata ${customerId}: ${response.status}`
    return null
  }

  const data = await response.json()
  return data.customer ?? null
}
```

- [ ] **Step 6: Run tests and commit**

Run:

```bash
pnpm vitest run src/services/core/external/discord-client.test.ts src/services/core/business/discord-role-sync.test.ts
pnpm run type-check
```

Commit:

```bash
git add src/services/core/external/discord-client.ts src/services/core/external/discord-client.test.ts src/services/core/external/medusa-admin-client.ts src/services/core/business/discord-role-sync.ts src/services/core/business/discord-role-sync.test.ts
git commit -m "feat(discord): add targeted role sync service"
```

---

## Task 5: Website connect, callback, disconnect, and resync routes

**Files:**
- Create: `src/app/api/discord/link/route.ts`
- Create: `src/app/api/discord/callback/route.ts`
- Create: `src/app/api/discord/disconnect/route.ts`
- Create: `src/app/api/discord/resync/route.ts`
- Tests beside each route.

- [ ] **Step 1: Add route tests for auth and email independence**

Create `src/app/api/discord/link/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCustomer = vi.fn()

vi.mock('@/lib/medusa-auth', () => ({
  getCustomer: (...args: unknown[]) => mockGetCustomer(...args),
}))

vi.mock('@/utils/env', () => ({
  env: {
    DISCORD_CLIENT_ID: 'client_1',
    DISCORD_LINK_STATE_SECRET: 'state_secret',
  },
}))

import { GET } from './route'

describe('GET /api/discord/link', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requires an authenticated customer and preserves Discord-first link params through login', async () => {
    mockGetCustomer.mockResolvedValueOnce(null)
    const response = await GET(
      new NextRequest('https://wcpos.com/api/discord/link?expected_discord_user_id=discord_1')
    )
    const location = response.headers.get('location') ?? ''

    expect(response.status).toBe(302)
    expect(location).toContain('/login')
    expect(location).toContain('redirect=%2Fapi%2Fdiscord%2Flink%3Fexpected_discord_user_id%3Ddiscord_1')
  })

  it('redirects to Discord without using customer email', async () => {
    mockGetCustomer.mockResolvedValueOnce({ id: 'cust_1', email: 'wcpos@example.com' })
    const response = await GET(new NextRequest('https://wcpos.com/api/discord/link'))
    const location = response.headers.get('location') ?? ''
    expect(response.status).toBe(302)
    expect(location).toContain('https://discord.com/oauth2/authorize')
    expect(location).not.toContain('wcpos%40example.com')
  })
})
```

- [ ] **Step 2: Implement link starter**

Create `src/app/api/discord/link/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getCustomer } from '@/lib/medusa-auth'
import { buildDiscordAuthorizeUrl } from '@/lib/discord/oauth'
import { createDiscordState } from '@/lib/discord/state'
import { env } from '@/utils/env'

export async function GET(request: NextRequest) {
  const customer = await getCustomer()
  if (!customer) {
    const redirect = `${request.nextUrl.pathname}${request.nextUrl.search}`
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', redirect)
    return NextResponse.redirect(loginUrl)
  }

  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_LINK_STATE_SECRET) {
    return NextResponse.redirect(new URL('/account/profile?discord=not_configured', request.url))
  }

  const expectedDiscordUserId = request.nextUrl.searchParams.get('expected_discord_user_id')
  const state = createDiscordState(
    { customerId: customer.id, expectedDiscordUserId },
    env.DISCORD_LINK_STATE_SECRET
  )

  const redirectUri = new URL('/api/discord/callback', request.url).toString()
  const location = buildDiscordAuthorizeUrl({
    clientId: env.DISCORD_CLIENT_ID,
    redirectUri,
    state,
  })

  return NextResponse.redirect(location)
}
```

- [ ] **Step 3: Add callback tests**

Create `src/app/api/discord/callback/route.test.ts` covering:

```ts
it('rejects callback when Discord OAuth user differs from expected Discord-first user')
it('updates current customer metadata from OAuth Discord user id and never compares email')
it('runs targeted role sync after storing metadata')
```

Use the same mock style as existing route tests. The important assertion is:

```ts
expect(mockUpdateCustomer).toHaveBeenCalledWith({
  metadata: expect.objectContaining({ discord_user_id: 'oauth_discord_user' }),
})
```

- [ ] **Step 4: Implement callback**

Create `src/app/api/discord/callback/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getCustomer, updateCustomer } from '@/lib/medusa-auth'
import { buildDiscordMetadataUpdate } from '@/lib/discord/metadata'
import { exchangeDiscordCode, fetchDiscordCurrentUser } from '@/lib/discord/oauth'
import { verifyDiscordState } from '@/lib/discord/state'
import { syncDiscordRoleForCustomer } from '@/services/core/business/discord-role-sync'
import { env } from '@/utils/env'

export async function GET(request: NextRequest) {
  const customer = await getCustomer()
  if (!customer) {
    const redirect = `${request.nextUrl.pathname}${request.nextUrl.search}`
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', redirect)
    return NextResponse.redirect(loginUrl)
  }

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  if (!code || !state || !env.DISCORD_LINK_STATE_SECRET) {
    return NextResponse.redirect(new URL('/account/profile?discord=failed', request.url))
  }

  const verified = verifyDiscordState(state, env.DISCORD_LINK_STATE_SECRET)
  if (verified.customerId !== customer.id) {
    return NextResponse.redirect(new URL('/account/profile?discord=session_mismatch', request.url))
  }

  const redirectUri = new URL('/api/discord/callback', request.url).toString()
  const token = await exchangeDiscordCode({
    code,
    clientId: env.DISCORD_CLIENT_ID ?? '',
    clientSecret: env.DISCORD_CLIENT_SECRET ?? '',
    redirectUri,
  })
  const discordUser = await fetchDiscordCurrentUser(token.access_token)

  if (verified.expectedDiscordUserId && verified.expectedDiscordUserId !== discordUser.id) {
    return NextResponse.redirect(new URL('/account/profile?discord=user_mismatch', request.url))
  }

  const updated = await updateCustomer({
    metadata: buildDiscordMetadataUpdate(customer.metadata, {
      userId: discordUser.id,
      username: discordUser.username,
      avatar: discordUser.avatar,
      linkedAt: new Date().toISOString(),
    }),
  })

  if (updated) {
    void syncDiscordRoleForCustomer({
      customerId: updated.id,
      metadata: updated.metadata,
      guildId: env.DISCORD_GUILD_ID,
      roleId: env.DISCORD_PRO_ROLE_ID,
      botToken: env.DISCORD_BOT_TOKEN,
      enabled: env.DISCORD_SYNC_ENABLED === 'true',
    }).catch(() => undefined)
  }

  return NextResponse.redirect(new URL('/account/profile?discord=linked', request.url))
}
```

- [ ] **Step 5: Implement disconnect and resync routes**

`src/app/api/discord/disconnect/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getCustomer, updateCustomer } from '@/lib/medusa-auth'
import { clearDiscordMetadataUpdate, getDiscordLinkFromMetadata } from '@/lib/discord/metadata'
import { createDiscordClient } from '@/services/core/external/discord-client'
import { env } from '@/utils/env'

export async function POST() {
  const customer = await getCustomer()
  if (!customer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const link = getDiscordLinkFromMetadata(customer.metadata)
  if (link && env.DISCORD_SYNC_ENABLED === 'true') {
    const discord = createDiscordClient({ botToken: env.DISCORD_BOT_TOKEN, enabled: true })
    await discord.removeRole({
      guildId: env.DISCORD_GUILD_ID ?? '',
      userId: link.userId,
      roleId: env.DISCORD_PRO_ROLE_ID ?? '',
      reason: 'WCPOS Discord account disconnected',
    }).catch(() => undefined)
  }

  const updated = await updateCustomer({ metadata: clearDiscordMetadataUpdate(customer.metadata) })
  return NextResponse.json({ customer: updated }, { status: 200 })
}
```

`src/app/api/discord/resync/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getCustomer } from '@/lib/medusa-auth'
import { syncDiscordRoleForCustomer } from '@/services/core/business/discord-role-sync'
import { env } from '@/utils/env'

export async function POST() {
  const customer = await getCustomer()
  if (!customer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await syncDiscordRoleForCustomer({
    customerId: customer.id,
    metadata: customer.metadata,
    guildId: env.DISCORD_GUILD_ID,
    roleId: env.DISCORD_PRO_ROLE_ID,
    botToken: env.DISCORD_BOT_TOKEN,
    enabled: env.DISCORD_SYNC_ENABLED === 'true',
  })

  return NextResponse.json({ result }, { status: 200 })
}
```

- [ ] **Step 6: Run tests and commit**

Run:

```bash
pnpm vitest run src/app/api/discord/link/route.test.ts src/app/api/discord/callback/route.test.ts
pnpm run type-check
```

Commit:

```bash
git add src/app/api/discord
git commit -m "feat(discord): add website account linking routes"
```

---

## Task 6: Account profile Discord card

**Files:**
- Create: `src/components/account/discord-connect-card.tsx`
- Test: `src/components/account/discord-connect-card.test.tsx`
- Modify: `src/app/[locale]/account/profile/page.tsx`

- [ ] **Step 1: Add component tests**

Create `src/components/account/discord-connect-card.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DiscordConnectCard } from './discord-connect-card'

describe('DiscordConnectCard', () => {
  it('shows connect link when unlinked', () => {
    render(<DiscordConnectCard metadata={{}} />)
    expect(screen.getByRole('link', { name: /connect discord/i })).toHaveAttribute('href', '/api/discord/link')
  })

  it('shows linked Discord user and action buttons when linked', () => {
    render(<DiscordConnectCard metadata={{ discord_user_id: '123', discord_username: 'paul', discord_linked_at: '2026-06-10T00:00:00.000Z' }} />)
    expect(screen.getByText(/paul/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /resync/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Implement card**

Create `src/components/account/discord-connect-card.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { getDiscordLinkFromMetadata } from '@/lib/discord/metadata'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function DiscordConnectCard({ metadata }: { metadata: Record<string, unknown> | undefined }) {
  const link = getDiscordLinkFromMetadata(metadata)
  const [busy, setBusy] = useState(false)

  async function post(url: string) {
    setBusy(true)
    try {
      await fetch(url, { method: 'POST' })
      window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Discord</CardTitle>
        <CardDescription>Connect Discord to receive the Pro User role while your WCPOS Pro license is active.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {link ? (
          <>
            <p className="text-sm">Connected as <span className="font-medium">{link.username ?? link.userId}</span></p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" disabled={busy} onClick={() => post('/api/discord/resync')}>Resync</Button>
              <Button type="button" variant="destructive" disabled={busy} onClick={() => post('/api/discord/disconnect')}>Disconnect</Button>
            </div>
          </>
        ) : (
          <Button asChild>
            <a href="/api/discord/link">Connect Discord</a>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Render card on profile page**

Modify `src/app/[locale]/account/profile/page.tsx`:

```ts
import { DiscordConnectCard } from '@/components/account/discord-connect-card'
```

Change `ProfileContent` return from one card to a fragment:

```tsx
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('cardTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ProfileEditForm
            customer={{
              email: customer.email,
              first_name: customer.first_name,
              last_name: customer.last_name,
              phone: customer.phone,
              metadata: customer.metadata,
            }}
          />
          <div className="flex justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">{t('memberSince')}</span>
            <span>{formatDateForLocale(customer.created_at, locale)}</span>
          </div>
        </CardContent>
      </Card>
      <DiscordConnectCard metadata={customer.metadata} />
    </div>
  )
```

- [ ] **Step 4: Run tests and commit**

Run:

```bash
pnpm vitest run src/components/account/discord-connect-card.test.tsx
pnpm run type-check
```

Commit:

```bash
git add src/components/account/discord-connect-card.tsx src/components/account/discord-connect-card.test.tsx 'src/app/[locale]/account/profile/page.tsx'
git commit -m "feat(discord): add account connect card"
```

---

## Task 7: Discord `/link` and `/status` interactions

**Files:**
- Create: `src/lib/discord/interactions.ts`
- Test: `src/lib/discord/interactions.test.ts`
- Create: `src/app/api/discord/interactions/route.ts`
- Test: `src/app/api/discord/interactions/route.test.ts`

- [ ] **Step 1: Choose signature verification path**

Before implementation, verify whether Node Web Crypto Ed25519 works in this project runtime:

```bash
node -e "crypto.subtle.importKey('raw', Buffer.alloc(32), {name:'Ed25519'}, false, ['verify']).then(()=>console.log('ok')).catch((e)=>{console.error(e.message); process.exit(1)})"
```

If it prints `ok`, use Web Crypto. If not, use `tweetnacl` or Discord's official interactions verifier package. Before adding a package, use the `install` and `version-check` skills.

- [ ] **Step 2: Implement interaction helpers**

Create `src/lib/discord/interactions.ts`:

```ts
import 'server-only'

export interface DiscordInteraction {
  type: number
  data?: { name?: string }
  member?: { user?: { id: string } }
  user?: { id: string }
}

export function interactionUserId(interaction: DiscordInteraction): string | null {
  return interaction.member?.user?.id ?? interaction.user?.id ?? null
}

export function ephemeralMessage(content: string) {
  return {
    type: 4,
    data: {
      content,
      flags: 64,
    },
  }
}

export function pong() {
  return { type: 1 }
}

export async function verifyDiscordInteractionSignature({
  body,
  signature,
  timestamp,
  publicKey,
}: {
  body: string
  signature: string | null
  timestamp: string | null
  publicKey: string | undefined
}): Promise<boolean> {
  if (!signature || !timestamp || !publicKey) return false

  const key = await crypto.subtle.importKey(
    'raw',
    Buffer.from(publicKey, 'hex'),
    { name: 'Ed25519' },
    false,
    ['verify']
  )

  return crypto.subtle.verify(
    { name: 'Ed25519' },
    key,
    Buffer.from(signature, 'hex'),
    Buffer.from(`${timestamp}${body}`)
  )
}
```

If Node Web Crypto is not viable and a dependency is added, keep the exported function signature identical.

- [ ] **Step 3: Add route tests**

Create `src/app/api/discord/interactions/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/discord/interactions', async () => {
  const actual = await vi.importActual<typeof import('@/lib/discord/interactions')>('@/lib/discord/interactions')
  return {
    ...actual,
    verifyDiscordInteractionSignature: vi.fn().mockResolvedValue(true),
  }
})

vi.mock('@/utils/env', () => ({
  env: { DISCORD_PUBLIC_KEY: 'public_key' },
}))

import { POST } from './route'

describe('POST /api/discord/interactions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('responds to ping', async () => {
    const response = await POST(new NextRequest('https://wcpos.com/api/discord/interactions', {
      method: 'POST',
      body: JSON.stringify({ type: 1 }),
      headers: { 'x-signature-ed25519': 'sig', 'x-signature-timestamp': 'ts' },
    }))
    expect(await response.json()).toEqual({ type: 1 })
  })

  it('returns an ephemeral link for /link', async () => {
    const response = await POST(new NextRequest('https://wcpos.com/api/discord/interactions', {
      method: 'POST',
      body: JSON.stringify({ type: 2, data: { name: 'link' }, member: { user: { id: 'discord_1' } } }),
      headers: { 'x-signature-ed25519': 'sig', 'x-signature-timestamp': 'ts' },
    }))
    const json = await response.json()
    expect(json.data.flags).toBe(64)
    expect(json.data.content).toContain('/api/discord/link?expected_discord_user_id=discord_1')
  })
})
```

- [ ] **Step 4: Implement interactions route**

Create `src/app/api/discord/interactions/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import {
  DiscordInteraction,
  ephemeralMessage,
  interactionUserId,
  pong,
  verifyDiscordInteractionSignature,
} from '@/lib/discord/interactions'
import { env } from '@/utils/env'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const valid = await verifyDiscordInteractionSignature({
    body,
    signature: request.headers.get('x-signature-ed25519'),
    timestamp: request.headers.get('x-signature-timestamp'),
    publicKey: env.DISCORD_PUBLIC_KEY,
  })

  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const interaction = JSON.parse(body) as DiscordInteraction
  if (interaction.type === 1) return NextResponse.json(pong())

  const command = interaction.data?.name
  const userId = interactionUserId(interaction)

  if (command === 'link') {
    if (!userId) return NextResponse.json(ephemeralMessage('Could not identify your Discord user.'))
    const link = new URL('/api/discord/link', request.url)
    link.searchParams.set('expected_discord_user_id', userId)
    return NextResponse.json(ephemeralMessage(`Connect your WCPOS account here: ${link.toString()}`))
  }

  if (command === 'status') {
    return NextResponse.json(ephemeralMessage('Open your WCPOS account profile to view or resync your Discord Pro status.'))
  }

  return NextResponse.json(ephemeralMessage('Unknown command.'))
}
```

- [ ] **Step 5: Register commands operationally**

Create a one-off script only if this project already has scripts for operational setup. Otherwise register `/link` and `/status` from the Discord Developer Portal or a local `curl` command documented in the PR body. The commands are:

```json
[
  { "name": "link", "description": "Link your WCPOS account to Discord", "type": 1 },
  { "name": "status", "description": "Check your WCPOS Discord Pro role status", "type": 1 }
]
```

- [ ] **Step 6: Run tests and commit**

Run:

```bash
pnpm vitest run src/lib/discord/interactions.test.ts src/app/api/discord/interactions/route.test.ts
pnpm run type-check
```

Commit:

```bash
git add src/lib/discord/interactions.ts src/lib/discord/interactions.test.ts src/app/api/discord/interactions
git commit -m "feat(discord): add link slash command endpoint"
```

---

## Task 8: Full reconciliation route

**Files:**
- Modify: `src/services/core/external/medusa-admin-client.ts`
- Modify: `src/services/core/business/discord-role-sync.ts`
- Create: `src/app/api/discord/reconcile/route.ts`
- Tests beside service/route.

- [ ] **Step 1: Add admin customer list helpers**

Extend `src/services/core/external/medusa-admin-client.ts`:

```ts
export async function listCustomersForDiscordReconciliation({
  limit = 100,
  offset = 0,
}: {
  limit?: number
  offset?: number
}): Promise<MedusaCustomer[]> {
  if (!env.MEDUSA_ADMIN_API_TOKEN) {
    throw new Error('MEDUSA_ADMIN_API_TOKEN is required for Discord reconciliation')
  }

  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  const response = await fetch(`${env.MEDUSA_BACKEND_URL}/admin/customers?${query.toString()}`, {
    headers: adminHeaders(),
  })

  if (!response.ok) {
    const message = `Failed to list customers for Discord reconciliation: ${response.status}`
    authLogger.error`${message}`
    throw new Error(message)
  }

  const data = await response.json()
  return data.customers ?? []
}
```

- [ ] **Step 2: Implement reconciliation orchestration**

Add to `src/services/core/business/discord-role-sync.ts`:

```ts
import { listCustomersForDiscordReconciliation } from '@/services/core/external/medusa-admin-client'

export interface DiscordReconciliationSummary {
  linkedChecked: number
  roleHoldersChecked: number
  added: number
  removed: number
  skipped: number
  errors: number
}

export async function reconcileDiscordProRole(input: {
  guildId: string | undefined
  roleId: string | undefined
  botToken: string | undefined
  enabled: boolean
}): Promise<DiscordReconciliationSummary> {
  const summary: DiscordReconciliationSummary = {
    linkedChecked: 0,
    roleHoldersChecked: 0,
    added: 0,
    removed: 0,
    skipped: 0,
    errors: 0,
  }

  const linkedByDiscordId = new Map<string, { customerId: string; metadata: Record<string, unknown> | undefined }>()

  try {
    for (let offset = 0; ; offset += 100) {
      const customers = await listCustomersForDiscordReconciliation({ limit: 100, offset })
      if (customers.length === 0) break

      for (const customer of customers) {
        const link = getDiscordLinkFromMetadata(customer.metadata)
        if (!link) continue
        linkedByDiscordId.set(link.userId, { customerId: customer.id, metadata: customer.metadata })
        summary.linkedChecked += 1

        try {
          const result = await syncDiscordRoleForCustomer({
            customerId: customer.id,
            metadata: customer.metadata,
            guildId: input.guildId,
            roleId: input.roleId,
            botToken: input.botToken,
            enabled: input.enabled,
          })
          if (result.action === 'added') summary.added += 1
          else if (result.action === 'removed') summary.removed += 1
          else if (result.action !== 'already_correct') summary.skipped += 1
        } catch {
          summary.errors += 1
        }
      }

      if (customers.length < 100) break
    }
  } catch {
    summary.errors += 1
    return summary
  }

  if (!input.enabled || !input.guildId || !input.roleId || !input.botToken) return summary

  const discord = createDiscordClient({ botToken: input.botToken, enabled: input.enabled })
  for (let after: string | undefined = undefined; ; ) {
    const members = await discord.listMembers({ guildId: input.guildId, after, limit: 1000 })
    if (members.length === 0) break

    for (const member of members) {
      after = member.userId
      if (!member.roles.includes(input.roleId)) continue
      summary.roleHoldersChecked += 1

      if (!linkedByDiscordId.has(member.userId)) {
        await discord.removeRole({
          guildId: input.guildId,
          userId: member.userId,
          roleId: input.roleId,
          reason: 'WCPOS Pro role reconciliation: no linked active customer',
        })
        summary.removed += 1
      }
    }

    if (members.length < 1000) break
  }

  return summary
}
```

Add a reconciliation service test that proves customer-list failures abort before the role-holder removal sweep:

```ts
it('aborts reconciliation before removing role holders when customer listing fails', async () => {
  mockListCustomersForDiscordReconciliation.mockRejectedValueOnce(new Error('Medusa unavailable'))

  const summary = await reconcileDiscordProRole({
    guildId: 'guild_1',
    roleId: 'role_1',
    botToken: 'bot_token',
    enabled: true,
  })

  expect(summary.errors).toBe(1)
  expect(mockListMembers).not.toHaveBeenCalled()
  expect(mockRemoveRole).not.toHaveBeenCalled()
})
```

- [ ] **Step 3: Add reconcile route**

Create `src/app/api/discord/reconcile/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { reconcileDiscordProRole } from '@/services/core/business/discord-role-sync'
import { env } from '@/utils/env'

async function handleReconcile(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (!env.CRON_SECRET || auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const summary = await reconcileDiscordProRole({
    guildId: env.DISCORD_GUILD_ID,
    roleId: env.DISCORD_PRO_ROLE_ID,
    botToken: env.DISCORD_BOT_TOKEN,
    enabled: env.DISCORD_SYNC_ENABLED === 'true',
  })

  return NextResponse.json({ summary }, { status: summary.errors > 0 ? 207 : 200 })
}

export async function GET(request: NextRequest) {
  return handleReconcile(request)
}

export async function POST(request: NextRequest) {
  return handleReconcile(request)
}
```

- [ ] **Step 4: Add route tests**

Create `src/app/api/discord/reconcile/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockReconcile = vi.fn()

vi.mock('@/services/core/business/discord-role-sync', () => ({
  reconcileDiscordProRole: (...args: unknown[]) => mockReconcile(...args),
}))

vi.mock('@/utils/env', () => ({
  env: {
    CRON_SECRET: 'secret',
    DISCORD_GUILD_ID: 'guild_1',
    DISCORD_PRO_ROLE_ID: 'role_1',
    DISCORD_BOT_TOKEN: 'bot',
    DISCORD_SYNC_ENABLED: 'true',
  },
}))

import { GET, POST } from './route'

describe('/api/discord/reconcile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects missing cron secret', async () => {
    const response = await POST(new NextRequest('https://wcpos.com/api/discord/reconcile', { method: 'POST' }))
    expect(response.status).toBe(401)
  })

  it('runs reconciliation via GET with configured guild and role for Vercel Cron', async () => {
    mockReconcile.mockResolvedValueOnce({ linkedChecked: 1, roleHoldersChecked: 1, added: 0, removed: 0, skipped: 0, errors: 0 })
    const response = await GET(new NextRequest('https://wcpos.com/api/discord/reconcile', {
      method: 'GET',
      headers: { authorization: 'Bearer secret' },
    }))
    expect(response.status).toBe(200)
    expect(mockReconcile).toHaveBeenCalledWith(expect.objectContaining({ guildId: 'guild_1', roleId: 'role_1' }))
  })

  it('also allows POST for manual operational runs', async () => {
    mockReconcile.mockResolvedValueOnce({ linkedChecked: 1, roleHoldersChecked: 1, added: 0, removed: 0, skipped: 0, errors: 0 })
    const response = await POST(new NextRequest('https://wcpos.com/api/discord/reconcile', {
      method: 'POST',
      headers: { authorization: 'Bearer secret' },
    }))
    expect(response.status).toBe(200)
    expect(mockReconcile).toHaveBeenCalledWith(expect.objectContaining({ guildId: 'guild_1', roleId: 'role_1' }))
  })
})
```

- [ ] **Step 5: Configure cron**

If the repo has `vercel.json`, add:

```json
{
  "crons": [
    {
      "path": "/api/discord/reconcile",
      "schedule": "0 3 * * *"
    }
  ]
}
```

If the repo does not track `vercel.json`, document in the PR body that Vercel Project Settings must call `POST /api/discord/reconcile` daily with `Authorization: Bearer $CRON_SECRET`.

- [ ] **Step 6: Run tests and commit**

Run:

```bash
pnpm vitest run src/app/api/discord/reconcile/route.test.ts src/services/core/business/discord-role-sync.test.ts
pnpm run type-check
```

Commit:

```bash
git add src/services/core/external/medusa-admin-client.ts src/services/core/business/discord-role-sync.ts src/app/api/discord/reconcile
git commit -m "feat(discord): add Pro role reconciliation"
```

---

## Task 9: Checkout sync hook

**Files:**
- Modify: `src/app/api/store/cart/complete/route.ts`
- Test: `src/app/api/store/cart/complete/route.test.ts`

- [ ] **Step 1: Add test that checkout does not fail when Discord sync fails**

Extend `src/app/api/store/cart/complete/route.test.ts` with a mock for `syncDiscordRoleForCustomer` and add:

```ts
it('does not fail checkout when Discord role sync rejects', async () => {
  mockGetCustomer.mockResolvedValueOnce({
    id: 'cust_1',
    metadata: { discord_user_id: 'discord_1' },
  })
  mockCompleteCart.mockResolvedValueOnce({ order: { id: 'order_1' } })
  mockSyncDiscordRoleForCustomer.mockRejectedValueOnce(new Error('Discord down'))

  const response = await POST(new NextRequest('https://wcpos.com/api/store/cart/complete', {
    method: 'POST',
    body: JSON.stringify({ cartId: 'cart_1' }),
  }))

  expect(response.status).toBe(200)
})
```

- [ ] **Step 2: Implement fire-and-forget sync**

Modify `src/app/api/store/cart/complete/route.ts` imports:

```ts
import { getDiscordLinkFromMetadata } from '@/lib/discord/metadata'
import { syncDiscordRoleForCustomer } from '@/services/core/business/discord-role-sync'
import { env } from '@/utils/env'
```

After successful cart completion and before returning JSON:

```ts
    if (getDiscordLinkFromMetadata(customer.metadata)) {
      void syncDiscordRoleForCustomer({
        customerId: customer.id,
        metadata: customer.metadata,
        guildId: env.DISCORD_GUILD_ID,
        roleId: env.DISCORD_PRO_ROLE_ID,
        botToken: env.DISCORD_BOT_TOKEN,
        enabled: env.DISCORD_SYNC_ENABLED === 'true',
      }).catch((syncError) => {
        storeLogger.warn`Discord role sync after checkout failed: ${syncError}`
      })
    }
```

- [ ] **Step 3: Run tests and commit**

Run:

```bash
pnpm vitest run src/app/api/store/cart/complete/route.test.ts
pnpm run type-check
```

Commit:

```bash
git add src/app/api/store/cart/complete/route.ts src/app/api/store/cart/complete/route.test.ts
git commit -m "feat(discord): sync role after checkout"
```

---

## Task 10: End-to-end manual validation and PR hardening

**Files:**
- Modify docs only if validation reveals setup notes that must be captured.

- [ ] **Step 1: Run package validation**

Run:

```bash
pnpm run lint
pnpm run type-check
pnpm test:unit
```

Expected: all pass. If any fail, fix before continuing.

- [ ] **Step 2: Verify Discord OAuth manually in a staging environment**

With staging env vars set:

```env
DISCORD_SYNC_ENABLED=true
DISCORD_GUILD_ID=711884517081612298
DISCORD_PRO_ROLE_ID=<staging-or-real-role-id>
DISCORD_BOT_TOKEN=<bot-token>
DISCORD_CLIENT_ID=<client-id>
DISCORD_CLIENT_SECRET=<client-secret>
DISCORD_PUBLIC_KEY=<public-key>
DISCORD_LINK_STATE_SECRET=<random-secret>
CRON_SECRET=<random-secret>
MEDUSA_ADMIN_API_TOKEN=<admin-token>
```

Manual checks:

- Log into wcpos.com staging as a customer with active Pro.
- Click Connect Discord.
- Authorize Discord OAuth.
- Confirm Medusa customer metadata contains `discord_user_id`.
- Confirm Discord `Pro User` role is added.
- Click Disconnect.
- Confirm metadata keys are cleared and role is removed.

- [ ] **Step 3: Verify Discord-first `/link`**

Manual checks:

- Run `/link` in Discord.
- Confirm the response is ephemeral.
- Open the link, log into WCPOS, complete OAuth.
- Confirm forwarded-link protection by starting `/link` as one Discord test user and completing OAuth as another; expected result is `?discord=user_mismatch` and no metadata update.

- [ ] **Step 4: Verify reconciliation**

Run against staging:

```bash
curl -i -X POST https://<staging-host>/api/discord/reconcile \
  -H "Authorization: Bearer $CRON_SECRET"
```

Expected:

- `200` when no errors.
- Summary JSON includes checked/added/removed/skipped counts.
- Manually granted `Pro User` role on an unlinked test member is removed.
- Expired test customer loses `Pro User`.
- During forced Keygen failure for one customer, existing role is not removed for an `unknown`/unverifiable result.

- [ ] **Step 5: Update PR body**

Include:

```md
## Operational setup

- Create Discord app under WCPOS-controlled owner/team.
- Add bot to guild `711884517081612298`.
- Grant only Manage Roles.
- Put bot role above `Pro User`, below staff/admin roles.
- Set Discord interactions endpoint to `https://wcpos.com/api/discord/interactions`.
- Register `/link` and `/status` commands.
- Configure Vercel cron for `/api/discord/reconcile` with `CRON_SECRET`.

## Validation

- [paste lint/type/unit results]
- [paste staging OAuth/link test result]
- [paste reconciliation summary]
```

- [ ] **Step 6: Final commit if docs changed**

If docs or config notes changed:

```bash
git add <changed-files>
git commit -m "docs(discord): document role sync operations"
```

- [ ] **Step 7: Push and request review**

Before push, run required branch checks:

```bash
git branch -vv | grep "$(git branch --show-current)"
gh pr list --head "$(git branch --show-current)" --repo wcpos/wcpos-com
gh pr list --head "$(git branch --show-current)" --repo wcpos/wcpos-com --state merged
```

Then:

```bash
git push
```

Request review with the ADR and this plan linked.

---

## Self-Review

### Spec coverage

- Website-first linking: Task 5 and Task 6.
- Discord `/link`: Task 7.
- Customer metadata storage: Task 1 and Task 5.
- Email not used as identifier: Task 5 tests and callback design.
- Active-only entitlement with expiry removal: Task 2.
- Bot-managed role sync: Task 4.
- Unverifiable safety: Task 2 and Task 4.
- Manual role grants removed: Task 8.
- Daily reconciliation: Task 8.
- Checkout best-effort sync: Task 9.
- Ops/secrets: Task 1 and Task 10.

### Known implementation risk

The Medusa Admin API filter/auth details must be verified against the deployed `wcpos-medusa` configuration while implementing `medusa-admin-client.ts`. Keep those details isolated in that client so the rest of the sync architecture does not change if the exact Admin API query shape differs.
