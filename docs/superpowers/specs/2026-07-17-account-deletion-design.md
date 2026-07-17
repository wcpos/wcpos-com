# Self-service account deletion — design

**Date:** 2026-07-17
**Status:** Implemented (this branch + wcpos-medusa `codex/account-deletion-endpoint`)

## Goal

A button in the account area that lets a customer permanently delete their
account and personal data, honouring the GDPR-style erasure expectation
without destroying records we are legally required to keep.

## What deletion means

Removed:

- **Every auth identity, all providers** (emailpass, Google, GitHub, Discord)
  — the customer can no longer sign in anywhere, and the identity rows
  (including OAuth profile claims in `user_metadata`) are erased.
- **The Medusa customer record and its addresses** (profile, phone, billing
  details) — soft-deleted via the customer module so order references stay
  intact.
- **The session** — the cookie is cleared only after the backend confirms.

Retained, by deliberate decision:

- **Orders.** Transactional records are kept for tax/accounting (the standard
  erasure exemption). Disclosed in the confirm dialog.
- **Keygen licence keys.** Already-issued keys keep working — consistent with
  the standing policy that expiry/absence of an account never bricks the
  plugin. They simply become unmanageable/unrenewable from an account.
- **Stripe objects.** No auto-charge path exists today (renewal charging is
  not shipped), so an orphaned Stripe customer is inert. Follow-up if that
  changes.

Also on deletion, the email is added to the backend **email-suppression
list**, so lifecycle email (expiry reminders, winback) stops — otherwise the
Keygen-driven jobs would keep mailing a deleted customer.

## Architecture

Two repos, backend merges/deploys first:

1. **wcpos-medusa** — `DELETE /store/customers/me/account`, guarded by
   `authenticate("customer", ["bearer"])` in `src/api/middlewares.ts`.
   Runs under the per-customer advisory lock (`withCustomerAuthLock`):
   enumerate + delete all auth identities and provider identities, suppress
   the email, delete addresses, soft-delete the customer. Retry-safe if a
   prior attempt died mid-way. Security-held customers are blocked by the
   existing customers-family middleware (they must contact support).
2. **wcpos-com** — `DELETE /api/account` route: same-origin check → rate
   limit (3/15 min/IP) → `assertViewOnly()` (an impersonating admin must
   never delete) → `getCustomer()` → backend call via
   `deleteCustomerAccount()` in `src/lib/medusa-auth.ts` → `logout()` only
   on success (a failed delete leaves the session so the error is visible
   and retryable). Errors are stable `errorCode`s, translated client-side.

## UI

Danger-zone card (`DeleteAccountCard`) at the bottom of `/account/profile`:
destructive-tinted card, quiet `ghost-destructive` trigger, confirm `Dialog`
listing the three consequences (sign-in gone, licences unmanageable but
working, orders retained). The solid `destructive` confirm button stays
disabled until the customer re-types their account email (locale-neutral,
unlike a translated "DELETE" keyword; compared case-insensitively, trimmed).
On success the client navigates with `navigateAfterAuthChange('/', locale)`
— a full document load, since client-side transitions would keep serving RSC
payloads rendered for the deleted identity.

All strings exist in all 10 locales; `account_deletion_failed` joins the
translated `apiErrors` codes.

## Testing

- Unit (com): route guards (origin, rate limit, view-only, auth, failure
  keeps session) and card behaviour (arm/disarm, success navigation, error
  toasts) — colocated vitest.
- Unit (medusa): handler happy path, unauthenticated, retry-after-partial-
  failure, no-internal-leak on error.
- E2E (com): mock backend gained the endpoint (token + credentials die with
  the account); spec drives profile → dialog → type-to-confirm → deletion →
  signed-out homepage → account area bounces to login.
