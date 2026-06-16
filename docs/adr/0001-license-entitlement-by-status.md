# Expired licenses keep pre-expiry downloads; suspended and revoked get nothing

A naturally expired license keeps access to releases published before its
expiry date — customers paid for that year of updates and keep what they
paid for. Suspended and revoked licenses grant nothing at all, including
older releases, because those states only occur deliberately (refund,
chargeback, dispute): the purchase was unwound, so the entitlement is too.
The asymmetry is intentional. Any currently active license — including
Lifetime, which has no expiry — grants every release outright; only when
no license is active is entitlement decided per release, by comparing
publish date to the latest expiry across the customer's active/expired
licenses (`isReleaseAllowedForLicenses`). The same rule serves the account
downloads page and the WordPress-plugin-facing `/api/pro` endpoints.

Statuses are compared in the canonical vocabulary (CONTEXT.md), not
Keygen's raw status space, which is wider: EXPIRING (within days of
expiry) and INACTIVE (no validation in ~90 days) are paid, in-term
licenses and normalize to active; BANNED normalizes to revoked; anything
unrecognized fails closed as unverifiable
(`normalizeLicenseStatus`, src/lib/license-status.ts).
