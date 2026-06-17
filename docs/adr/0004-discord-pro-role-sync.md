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

## Superseded account linking model

The original v1 account-linking design stored one Discord identity on Medusa
customer metadata. That model is superseded for the account redesign by
[ADR-0007](0007-pro-discord-access-per-licence.md). Greenfield
implementations must not add customer-level `discord_*` metadata links; Discord
access is now stored as licence connected-member metadata and managed from the
licence page.

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
- `MEDUSA_ADMIN_API_TOKEN` for reconciliation over licence-owning customer orders

## Deferred decisions

A dedicated external connected-member table is deferred for this greenfield
slice. The current implementation stores the licence-member collection on
Keygen licence metadata (`discord_access`) so access follows the licence record
without customer-level link state. Promote to a dedicated store only if metadata
contention, audit/history, or indexed reverse lookup becomes important.

Keygen webhooks are also deferred. They can later accelerate targeted sync on
license expiry, renewal, suspension, or revocation, but reconciliation remains
the source of correctness.

Discord Linked Roles are deferred. They may provide richer Discord-native
connection metadata, but they require persistent per-user Discord OAuth tokens
and refresh/revocation handling. That cost is not justified for v1 role sync.
