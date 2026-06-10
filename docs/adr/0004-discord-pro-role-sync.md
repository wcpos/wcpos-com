---
status: accepted
---

# Discord Pro role is bot-managed from active license entitlement

WCPOS Pro customers can link a Discord account from the wcpos.com account area.
The site grants the Discord Pro role while the customer has at least one active
license, and removes it when no active license remains. This community role is a
perk of current Pro status, not a download entitlement: expired licenses keep the
pre-expiry downloads described in ADR-0001, but expired/suspended/revoked
licenses do not grant the Discord role.

The implementation uses a bot-managed role instead of Discord Linked Roles. The
customer authorizes Discord OAuth with `identify` only; wcpos.com stores the
Discord user ID and display metadata on the Medusa customer metadata, discards
the user OAuth token, and uses a server-side bot token to add/remove the guild
role. This avoids storing permanent per-user Discord refresh tokens and keeps the
role fully derivable from WCPOS license data.

Durable link state lives on the customer record as `discord_user_id`,
`discord_username`, `discord_avatar`, and `discord_linked_at`. This is enough at
current community scale and keeps the first implementation inside wcpos-com. If
linked users grow into the thousands, or if hard database uniqueness becomes
necessary, promote this metadata to a dedicated Medusa module/table and migrate
these keys.

Reconciliation is the correctness mechanism. Vercel cron calls
`/api/discord/reconcile`, guarded by `CRON_SECRET`, and the route sweeps both
sides: linked customers are synced to their current entitlement, and current
Discord Pro-role holders with no entitled linked customer are demoted. Inline
syncs after link, unlink, resync, and checkout are best-effort conveniences; a
missed inline sync is repaired by reconciliation.

License status is normalized before role checks. `active` grants the role when
expiry is absent or in the future. `expired`, `suspended`, and `revoked` do not.
Unverifiable licenses (`unknown`) do not grant new roles, but also do not trigger
demotion; missing Keygen data must not remove a community role until the current
license state can be confirmed.

Required production secrets are `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`,
`DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_PRO_ROLE_ID`, `CRON_SECRET`,
and `MEDUSA_ADMIN_API_TOKEN` for reconciliation. `DISCORD_PUBLIC_KEY` is reserved
for a future Discord Interactions endpoint. The bot should have only Manage Roles
permission, with the Server Members privileged intent enabled for reconciliation
sweeps, and its highest role should sit immediately above the Pro role in the
server hierarchy.

Deferred work: a Discord `/link` command can deep-link users back to the account
page, and Keygen webhooks can accelerate expiry demotion once the license-to-
customer lookup is made explicit. Those paths improve latency and UX; they are
not the source of truth.
