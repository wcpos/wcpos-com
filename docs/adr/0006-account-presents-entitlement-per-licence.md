# The account presents download entitlement per-licence, not pooled

The customer account area shows downloads, update availability, and site
status **per licence** — each licence is the unit of entitlement — rather
than pooling a customer's licences into a single account-wide verdict.

## Context

A WCPOS Pro site (a WordPress/WooCommerce instance) is activated against
exactly one Keygen licence and its plugin update checks key off only that
licence's status and expiry (`/api/pro/update?key=&instance=` →
`isReleaseAllowedForLicenses(release, [thatOneLicence])`). The plugin
enforcement is therefore strictly **per key**.

The account Downloads page, however, evaluated entitlement as a **union**
across the customer's whole set of licences (`isReleaseAllowedForLicenses(
release, allLicences)`): if any one licence was active, the page offered the
latest build for the entire account. For a customer holding an active
licence A and an expired licence B this produced a contradiction — the
browser said "Download latest", but a site bound to expired key B was
correctly refused that build by the plugin. The account never said *which*
licence a download was for, so it promised access the plugin would not
honour on the B-bound site. Not a security hole (the plugin enforces
correctly), but a broken promise.

Renewals extend the same licence (`findExistingLicense` renews +365 days
rather than creating a duplicate), so multi-licence is uncommon — a customer
holds two licences only by owning two different products (Yearly + Lifetime)
or via a legacy/lost key. The common "expired" case is a single lapsed
yearly licence.

## Decision

The account treats each licence as the entitlement unit:

- Each licence shows its own status, expiry, activated sites, and the newest
  build **it** can download — the same answer the plugin gives that
  licence's sites.
- A convenience "download latest" shortcut is allowed, but it must be
  **attributed by name** to the active licence it draws from ("Latest — via
  your active Yearly licence"), never an unqualified account-wide button.
- A site running on an expired licence shows its **update ceiling** (the
  newest release published before that licence's expiry), so the account
  states exactly what the plugin will serve that site.

Alternatives weighed: keep the union (rejected — preserves the broken
promise); strict per-licence with no shortcut at all (rejected — loses
one-click "give me the latest" for the single-licence majority, for whom
per-licence and union are identical anyway).

## Consequences

- The account and the plugin now agree; "Download latest" can no longer mean
  something the plugin refuses.
- The Downloads page stops being a single union verdict; download
  availability becomes a property attributed to a specific licence.
- Multi-licence customers see one self-contained card per licence; the rare
  Yearly+Lifetime / lapsed cases read honestly.
- The entitlement primitive (`isReleaseAllowedForLicenses`) is unchanged —
  only what we pass it (one licence, not the pooled array) and how we label
  the result. The per-key plugin path was already correct.
