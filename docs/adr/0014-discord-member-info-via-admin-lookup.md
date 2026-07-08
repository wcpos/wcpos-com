# Discord member info is an admin-only ephemeral lookup, not public profile metadata

Support staff see the customer facts behind a Discord member through an
admin-gated, ephemeral "Customer info" context command (right-click a member
→ Apps). Discord's Linked Roles profile metadata (`role_connections`) is
**deferred**, and if it ships later it is cosmetic only — never the
entitlement gate.

## Context

The owner wants to click a Discord member's profile and see who they are as
a customer: how long they have been one, which licences back their Pro role,
when those expire. Discord offers two vehicles:

- **Linked Roles metadata** (`role_connections`): up to 5 typed fields
  (integer/datetime/boolean — no free text) attached to the member's profile
  connection, visible to other members. Writing it requires each member to
  complete an extra OAuth grant (`role_connections.write`), and keeping it
  current requires storing a **per-user Discord refresh token** and
  re-pushing on entitlement changes. ADR-0004 explicitly deferred Linked
  Roles for exactly this token-custody cost.
- **A user context command**: a bot interaction that can return an
  arbitrarily rich embed, visible only to the invoker (ephemeral), gated to
  admins via Discord-native command permissions. Needs no OAuth from the
  member being inspected and no stored tokens — it reads the same
  licence→connected-members metadata and Medusa order history the site
  already has.

## Decision

1. **The support answer is the context command.** "Customer info" returns an
   ephemeral card: connected licences with status and expiry, seat usage,
   holder email, and customer-since (earliest order). Customer PII stays
   visible only to admins who invoke it, not on a public profile.
2. **Linked Roles metadata is deferred to its own phase.** If built, it is a
   public *badge* (e.g. customer-since date), additive and cosmetic. The Pro
   role itself stays bot-assigned from licence entitlement (ADR-0004/0007);
   role possession must never depend on possibly-stale pushed metadata or on
   members completing an extra OAuth grant.

Rejected alternative: leading with Linked Roles metadata. It cannot carry
free text (no email, no notes), it shows customer facts to the whole server
rather than to support, it silently excludes members who never complete the
extra OAuth, and it forces the refresh-token custody question before it pays
anything back.

## Consequences

- Requires a Discord interactions endpoint (signature-verified with the
  application public key) — the same endpoint that serves `/link` and
  `/unlink` (ADR-0007 amendment).
- Customer-since comes from order history (migrated orders keep their
  original dates), falling back to licence creation; a key-claimed member
  with no wcpos.com account shows licence-backed facts only.
- When the Linked Roles phase is picked up, it needs its own decision on
  refresh-token storage (the only per-member private store today is the
  licence `discordAccess` metadata) and on staleness tolerance; nothing in
  this decision blocks or presupposes that design.
