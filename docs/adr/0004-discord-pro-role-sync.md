# Discord Pro role is synced from active Medusa/Keygen entitlement

The WCPOS Discord `Pro User` role is an automated, bot-owned role derived
from the customer's current WCPOS Pro entitlement. Medusa/Keygen remains the
source of truth; Discord is only the projection of that state.

## Decision

Use a Discord bot to manage the normal Discord `Pro User` role in guild
`711884517081612298`. Do not use Discord Linked Roles for v1.

A customer receives the role only while they have at least one active WCPOS Pro
license:

- Lifetime active licenses grant the role.
- Yearly active licenses grant the role until expiry.
- Expired licenses do not grant the role.
- Suspended and revoked licenses do not grant the role.
- Unverifiable licenses do not grant the role, but a temporary verification
  outage must not by itself remove an already-held role during reconciliation.

This intentionally differs from download entitlement: expired licenses can keep
access to releases published during their term, but the Discord community perk
requires current active Pro status.

## Account linking

Store the Discord link on the Medusa customer metadata for v1:

- `discord_user_id`
- `discord_username`
- `discord_avatar`
- `discord_linked_at`
- `discord_last_synced_at`

Do not infer identity from email address. A customer's WCPOS email and Discord
email may differ. The link is created only from both of these proofs:

1. an authenticated Medusa customer session on wcpos.com, and
2. a verified Discord OAuth `identify` result for the Discord account.

Both linking entry points are supported:

- Website-first: the logged-in customer clicks **Connect Discord** in the
  account area.
- Discord-first: the customer runs `/link` in Discord and receives an ephemeral
  wcpos.com linking URL.

The Discord-first URL should carry a short-lived signed state binding it to the
Discord user who invoked `/link`; the OAuth callback must reject the link if the
OAuth Discord user differs from that expected user. This prevents forwarded link
URLs from linking the wrong Discord identity.

## Role ownership

`Pro User` is bot-owned. Reconciliation removes manual grants that are not backed
by a linked Medusa customer with active Pro entitlement.

If a manual exception is needed, create a separate admin-managed role such as
`Honorary Pro` with equivalent channel permissions. Do not use the synced
`Pro User` role as an allowlist.

## Reconciliation

A scheduled reconciliation job is the correctness mechanism. Event-driven syncs
are convenience accelerators only.

Run a protected wcpos.com route from Vercel Cron, guarded by `CRON_SECRET`. The
job must sweep both directions:

1. Linked customers: resolve each customer's licenses from Medusa orders and
   Keygen, then add or remove the Discord role to match active entitlement.
2. Current Discord `Pro User` holders: remove the role from anyone who has no
   linked customer or whose linked customer lacks active entitlement.

This catches expiry, unlink drift, manual role grants, missed checkout hooks, and
Discord/API failures that heal on the next run.

## Discord operations

The Discord bot needs only the permissions required to manage the target role.
It must not be granted administrator permissions. Its highest role must sit above
`Pro User` and below staff/admin roles in Discord's role hierarchy. The bot must
also have the Server Members privileged intent enabled for reconciliation sweeps
that list current guild members.

Required secrets live only in server-side deployment environment variables:

- `DISCORD_GUILD_ID`
- `DISCORD_PRO_ROLE_ID`
- `DISCORD_BOT_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_PUBLIC_KEY` for slash-command interaction signature verification
- `CRON_SECRET`
- `MEDUSA_ADMIN_API_TOKEN` for customer-wide duplicate-link checks and
  reconciliation
- `DISCORD_SYNC_ENABLED` kill switch

## Deferred decisions

A dedicated Medusa `customer_discord_link` table is deferred. Promote from
customer metadata only if linked-user count grows into the thousands, reverse
lookup becomes hot, hard database uniqueness is needed, or audit/history becomes
important.

Keygen webhooks are also deferred. They can later accelerate targeted sync on
license expiry, renewal, suspension, or revocation, but reconciliation remains
the source of correctness.

Discord Linked Roles are deferred. They may provide richer Discord-native
connection metadata, but they require persistent per-user Discord OAuth tokens
and refresh/revocation handling. That cost is not justified for v1 role sync.
