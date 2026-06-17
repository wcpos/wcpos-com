# WCPOS.com

The commercial site for WooCommerce POS: marketing, Pro checkout, and the
customer account area where licenses, downloads, and orders are managed.
Commerce runs on Medusa; licensing runs on Keygen CE.

## Language

### Licensing

**License**:
A customer's right to use WCPOS Pro, created by a purchase and identified
by a license key. Yearly (expires) or Lifetime (no expiry).
_Avoid_: subscription, membership

**Plan**:
The product tier a License grants — Yearly (a year of updates, then
expires) or Lifetime (no expiry). Identified internally by a PlanId,
mapped to one Keygen policy and one Medusa product handle, with the
display label, in the single registry `src/lib/plans.ts`. An unrecognized
policy resolves to no plan (never guessed).
_Avoid_: tier, SKU, subscription level

**Active (license)**:
A license inside its term, or a Lifetime license. Grants downloads,
updates, and machine activations. Keygen's raw EXPIRING and INACTIVE
statuses are in-term paid licenses and normalize to active
(`normalizeLicenseStatus`, src/lib/license-status.ts). Normalization
happens once, at the Keygen adapter seam (license-client `mapLicenseData`);
every `LicenseDetail.status` and the deep License module
(`src/lib/license.ts`) work in the canonical vocabulary.

**Expired (license)**:
A license that reached the natural end of its term. Keeps access to
releases published before its expiry; gains nothing newer. The only
non-active state that retains any access.
_Avoid_: lapsed, inactive

**Suspended (license)**:
An administrative hold placed deliberately (refund in progress,
chargeback, dispute). Grants nothing while held; reversible.
_Avoid_: paused, frozen, cancelled

**Revoked (license)**:
A permanently terminated license (refund granted, fraud). Grants nothing,
irreversibly. Keygen's raw status for this state is BANNED.
_Avoid_: deactivated, deleted, cancelled

**Renewal**:
A new manual purchase that extends a license. There is no automatic
billing; nothing renews without the customer buying again. A renewal
extends the SAME license (same key); it does not create a second one.
_Avoid_: auto-renew, recurring payment

**Entitlement**:
Whether a specific release is downloadable, decided PER LICENCE by that
licence's status and the release's publish date — not pooled across a
customer's licences. A site is bound to one licence and its updates follow
that licence's entitlement; the account presents downloads per-licence to
match what the plugin enforces per key. An expired licence's ceiling is the
newest release published before its expiry. (The shared entitlement
functions in `src/lib/license.ts` already accept a licences array, so
per-licence is calling them with a single-element array.) See
docs/adr/0006.
_Avoid_: access rights, permissions, pooled/union entitlement

**Activation (site)**:
The registration of one WCPOS Pro install — a single WordPress site / one
WooCommerce database instance — against a license, counted toward the
license's activation limit. Shown to the customer by its site URL.
Deactivating frees the slot. (Keygen's API calls these "machines"; that is
an implementation noun, not customer language.)
_Avoid_: machine, device, till, seat

**Connected member (Discord)**:
A Discord user linked to a licence by presenting its key, granted the Pro
community role while the licence is active, counted against the licence's
Discord seat cap. The licence holder sees and can remove connected members.
The licence key is therefore also a Discord-access credential. See
docs/adr/0007.
_Avoid_: subscriber, follower, guest

### Commerce

**Money-back guarantee**:
A 14-day, any-reason refund window on every purchase, worldwide. A
granted refund revokes the license.
_Avoid_: trial, return window

**Customer**:
The person who buys and holds licenses, authenticated via the Medusa
session. There are no separate "users" or roles on this site.
_Avoid_: user, account, client

**Pro offer**:
The sellable presentation of a Plan for marketing and Checkout: the Plan,
current Medusa variant, current price, checkout path, feature bullets, and
CTA copy resolved by the deep Pro offer catalog (`src/lib/pro-offer-catalog.ts`).
Rendering surfaces consume Pro offers instead of raw Medusa product/variant
shape or copied price strings.
_Avoid_: pricing card product, SKU, subscription

**Checkout**:
The flow that turns a cart into a paid order: open a payment session with
a provider (Stripe or PayPal), the Customer pays, then complete the cart.
Completion runs **only after the provider has confirmed payment**.
_Avoid_: purchase flow, buy

**Order**:
A completed purchase in Medusa: line items, totals, and the metadata
that carries the license keys it issued. The source of a customer's
license references (`extractLicenseReferencesFromOrders`). Fetched via
the deep `customer-orders` module (`src/lib/customer-orders.ts`);
identified by Medusa `id` and a human-facing `display_id`.
_Avoid_: invoice, transaction, receipt (the receipt is the rendered PDF
of an order, not the order itself).

**Order pending**:
The state where payment was captured but the order could not be created.
The Customer must **not** pay again; support finishes or refunds it.
Surfaced as `OrderPendingError` client-side and a `409 order_pending`
response from the completion route.
_Avoid_: failed payment, retryable error

**Unverifiable (license)**:
A license reference whose current state cannot be confirmed right now
(license server unreachable, or a legacy key that no longer resolves).
Presented honestly as unverified; grants nothing while unverified, but is
never treated as revoked.
_Avoid_: unknown, broken, invalid

### Discord community

**Discord link**:
A verified association between Discord identity and WCPOS Pro entitlement.
The current account design uses a licence→connected-members relation: a
Discord user self-links with a licence key plus OAuth `identify`, without
needing their own wcpos.com account. The older one-Medusa-customer-to-one-
Discord-user metadata link is the legacy v1 model from docs/adr/0004 and is
superseded for the per-licence account redesign by docs/adr/0007.
_Avoid_: Discord login, Discord auth provider

**Discord Pro role**:
A bot-managed community role in the WCPOS Discord server. Granted only while
the Discord user is backed by at least one active connected licence (or, for
legacy links, a linked customer with active Pro entitlement). Expired licences
can retain pre-expiry downloads, but they do not keep this current-community
perk.
_Avoid_: membership, subscription role

**Role sync**:
The idempotent operation that compares Discord role state with all backing
entitlement links for that Discord user. It grants the Discord Pro role when
any connected licence is active, and removes it only after no active
licence-member link or legacy active customer link remains.
_Avoid_: manual role management

**Reconciliation**:
The scheduled two-way sweep that syncs licence-member links, legacy linked
customers, and current Discord Pro role holders. It removes orphaned/manual
role grants only after confirming the holder has no active licence-member
link and no legacy active customer link. Inline syncs are best-effort;
reconciliation is the correctness guarantee.
_Avoid_: one-way cleanup, cron-only expiry check
