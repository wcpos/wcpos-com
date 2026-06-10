# Expired licenses keep pre-expiry downloads; suspended and revoked get nothing

A naturally expired license keeps access to releases published before its
expiry date — customers paid for that year of updates and keep what they
paid for. Suspended and revoked licenses grant nothing at all, including
older releases, because those states only occur deliberately (refund,
chargeback, dispute): the purchase was unwound, so the entitlement is too.
The asymmetry is intentional; entitlement is decided per release by
comparing publish date to the latest expiry across the customer's
active/expired licenses only (`isReleaseAllowedForLicenses`), and the same
rule serves the account downloads page and the WordPress-plugin-facing
`/api/pro` endpoints.
