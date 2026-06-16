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
billing; nothing renews without the customer buying again.
_Avoid_: auto-renew, recurring payment

**Entitlement**:
Whether a specific release is downloadable for a customer's set of
licenses. Decided by license status and release publish date.
_Avoid_: access rights, permissions

**Machine (activation)**:
A till/store device registered against a license, counted toward the
license's activation limit. Deactivating frees the slot.
_Avoid_: seat, device slot

### Commerce

**Money-back guarantee**:
A 14-day, any-reason refund window on every purchase, worldwide. A
granted refund revokes the license.
_Avoid_: trial, return window

**Customer**:
The person who buys and holds licenses, authenticated via the Medusa
session. There are no separate "users" or roles on this site.
_Avoid_: user, account, client

**Checkout**:
The flow that turns a cart into a paid order: open a payment session with
a provider (Stripe or PayPal), the Customer pays, then complete the cart.
Completion runs **only after the provider has confirmed payment**.
_Avoid_: purchase flow, buy

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
A verified association between one Medusa customer and one Discord user ID,
created by Discord OAuth using the `identify` scope. Stored on customer
metadata until scale requires a dedicated Medusa table.
_Avoid_: Discord login, Discord auth provider

**Discord Pro role**:
A bot-managed community role in the WCPOS Discord server. Granted only while
the linked customer has an active license. Expired licenses can retain
pre-expiry downloads, but they do not keep this current-community perk.
_Avoid_: membership, subscription role

**Role sync**:
The idempotent operation that compares a linked customer's active-license
state with their Discord role state, then adds or removes the Discord Pro role
when needed.
_Avoid_: manual role management

**Reconciliation**:
The scheduled two-way sweep that syncs all linked customers and removes
orphaned/manual Discord Pro role grants from current role holders. Inline syncs
are best-effort; reconciliation is the correctness guarantee.
_Avoid_: one-way cleanup, cron-only expiry check
