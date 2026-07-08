# Pro Discord access is a per-licence, key-claimed, capped team perk

Pro community access in Discord is a benefit of an active licence, extended
to multiple Discord users ("connected members") per licence — not a single
link on the buyer's customer record. This supersedes the per-customer
single-link model in
[0004](0004-discord-pro-role-sync.md).

## Context

ADR-0004 modelled the Discord link as **one Discord account per Medusa
customer** (singular `discord_*` fields on customer metadata), with the Pro
role granted while that customer had any active licence. It explicitly
deferred a per-licence link collection "until multiple links or
audit/history matter."

The owner wants Pro Discord support to be a **team perk of the licence**: a
business buys WCPOS Pro and several people (owner, staff, developers) want
the premium Pro support role. The licence holder should see how many Discord
users are connected to their licence. That is exactly the deferred case, so
the link moves from the customer to the **licence**, and we need a seat
concept and a way for members to join.

## Decision

1. **Per-licence membership.** A licence carries a collection of connected
   Discord members, each holding the Pro community role while the licence is
   active. The link belongs to the licence, not the buyer's customer record.

2. **Key-claimed self-link.** A Discord user connects by presenting the
   **licence key** (Discord-first `/link <key>`, or a website linking page)
   plus a verified Discord OAuth `identify`. Possession of the key is the
   proof — a member does **not** need a wcpos.com account. (This replaces
   ADR-0004's requirement of an authenticated Medusa customer session for
   the person being linked; that session is now required only for the
   *holder's* management view, below.)

3. **Capped seats.** Each licence grants the role to at most a fixed number
   of members. The cap is the abuse control for key-claiming: a leaked key
   can onboard at most N people, not an unbounded community. Exceeding the
   cap refuses further self-links until a seat is freed. (Cap basis — a
   per-plan number vs mirroring the site-activation limit — is an open
   follow-up.)

4. **Holder visibility and removal.** The licence holder (the logged-in
   customer who owns the licence) sees the connected members on the licence
   page — count, handle/avatar, joined date — and can **remove** a member,
   freeing a seat. Removal records the Discord user ID as blocked for that
   licence, so the same person cannot immediately reclaim the seat with the
   same shared key; restoring that person requires explicit holder action
   (or a future key-rotation flow). Removal is the holder's control, since
   joining is key-based rather than invite-approved.

5. **Entitlement-driven, as before.** Role grants follow licence status:
   a connected member keeps the role while they have at least one active
   connected licence. Reconciliation removes the role from a Discord user
   only after checking all licence-member links for that Discord user and
   finding no active licence left (unchanged principle from ADR-0004, now
   evaluated across licence-member links rather than one customer link).

Rejected alternatives: single-person link (ADR-0004 as-is — doesn't deliver
the team perk); uncapped membership (one key could grant Pro Discord to an
unbounded community); holder-approved invites only (more control, but the
owner chose lower-friction key self-claim with the cap as the safeguard).

## Consequences

- The deferred per-licence Discord-link collection becomes real now, with a
  seat count; ADR-0004's singular customer `discord_*` fields are
  superseded by a licence→members relation.
- **The licence key now doubles as a Discord-access credential**, not only a
  plugin-activation credential. The seat cap bounds the blast radius of a
  leaked key for Discord; site activation remains separately capped. The
  greenfield wcpos.com slice stores this connected-member collection on the
  licence metadata under `discord_access`.
- Reconciliation walks licence → connected members to grant roles, then
  groups by Discord user before removing roles so another active connected
  licence can preserve access.
- The current-role-holder sweep checks both backing models before treating a
  role as orphaned: the legacy customer link from ADR-0004 and the new
  licence→members relation. A key-claimed member with no wcpos.com account is
  valid when backed by an active connected licence.
- The licence page gains a "Discord access" section (members of N, list,
  remove). The plugin/site model is untouched — Discord seats and site
  activations are independent caps on the same licence.

## Open

- **Cap basis and number** — implemented initially as a dedicated Discord seat
  cap of 5 per licence, separate from site activations. This can move to a
  per-plan registry field when product wants different caps by plan.
- **Unblocking** — holder removal block-lists the Discord user for that
  licence with no unblock control yet; restoring a mistakenly removed member
  currently needs support intervention. A holder-facing unblock (or block
  expiry) is a follow-up.

## Amendment (2026-07-08): claim entry points finalised

Decision 2 left two claim entry points open ("Discord-first `/link <key>`, or
a website linking page"). The **public website linking page is dropped**; the
two shipped entry points are:

1. **Account-area Connect button** (licence card, signed-in holder). The form
   pre-fills the licence key the holder already owns and runs the same OAuth
   `identify` claim. The holder's own connection consumes a seat like any
   other member — there is no holder-exempt seat.
2. **`/link <key>` in the Discord server** (any member, no wcpos.com account).

Rationale for dropping the public page: every claimant must join the Discord
server anyway to receive the role, so a slash command inside the server is
never less reachable; the command inherits guild membership as a prerequisite
and Discord's interaction rate limits, whereas an unauthenticated key-entry
page is an extra licence-key brute-force surface needing its own abuse
controls for no added reach.

Removal semantics are asymmetric by design:

- **Holder removal** (decision 4) block-lists the removed Discord user for
  that licence — it is the holder's abuse control over a shared key.
- **Self-unlink** (`/unlink`, a member releasing their own seat) frees the
  seat **without** block-listing — leaving voluntarily is not an offence, and
  block-listing here would make an accidental unlink permanent.
