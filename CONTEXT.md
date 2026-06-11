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
(`normalizeLicenseStatus`, src/lib/license-status.ts).

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

**Unverifiable (license)**:
A license reference whose current state cannot be confirmed right now
(license server unreachable, or a legacy key that no longer resolves).
Presented honestly as unverified; grants nothing while unverified, but is
never treated as revoked.
_Avoid_: unknown, broken, invalid
