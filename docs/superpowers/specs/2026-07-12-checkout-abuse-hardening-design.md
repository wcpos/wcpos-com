# Checkout Abuse Hardening Design

**Status:** Approved

## Incident basis

On 12 July 2026 an automated actor created 209 accounts and 417 carts in eight
minutes. Stripe received 205 payment sessions, three charges succeeded, and the
normal `order.placed` subscriber issued three licences. The licences had no
machine activations and have been suspended. Stripe charges and order evidence
must remain untouched for owner review.

The registration route appeared rate-limited, but its shared limiter allowed
every request when Upstash was unconfigured or unavailable. Registration and
checkout had no bot challenge. The remediation must prevent that silent
degradation without blocking ordinary sign-in or existing-account access.

## Goals

1. Require a valid Cloudflare Turnstile challenge before email/password account
   creation.
2. Enforce independent server-side limits for registration and creation of
   payment sessions.
3. Fail closed on protected mutations when the rate-limit service is missing or
   unavailable, while leaving sign-in and existing-account reads operational.
4. Provide a reversible `security_hold` for the three suspicious paid customer
   accounts and enforce it on login and account access.
5. Diagnose and repair owner-only read-only impersonation (“View as”) for held
   and ordinary customers.
6. Preserve orders, payments, customers, and authentication evidence. Do not
   refund charges or delete spam accounts in this change.

## Non-goals

- Automatically refunding, disputing, canceling, or modifying Stripe charges.
- Deleting the 206 unpaid spam accounts.
- Building a general fraud-scoring system.
- Replacing Stripe Radar or making unreviewed Radar rule changes through code.
- Suspending every account matching an email naming pattern.

## Architecture

### Bot verification

Reuse the existing server-side Turnstile adapter and public site key. Extract a
small reusable Turnstile widget from the support form only if the existing UI
cannot be shared directly. Registration requests carry a `turnstileToken`.
Production registration rejects missing, invalid, expired, or unverifiable
tokens. Existing explicit test/development behavior remains deterministic and
must not create a production bypass.

Both the standalone registration page and inline checkout account step must
render the challenge and reset it after a rejected submission. OAuth and login
do not require Turnstile in this incident response.

### Rate limiting

Evolve the shared limiter result so callers can distinguish:

- `allowed`: counter succeeded and the request is under quota;
- `limited`: counter succeeded and quota was exhausted;
- `unavailable`: credentials are absent or the service call failed.

Registration and payment-session creation treat `limited` as HTTP 429 and
`unavailable` as HTTP 503. This is the fail-closed boundary. Existing low-risk
callers may retain their documented behavior rather than inheriting a global
policy change accidentally.

Registration remains limited by normalized client IP. Payment-session creation
uses two independent keys: client IP and authenticated customer ID. The route
must pass both checks before asking Medusa/Stripe to allocate a session. Limits
will be conservative enough for a normal checkout retry but far below the
incident rate; exact constants live beside each route and are locked by tests.

Upstash remains the initial backend because the repository already depends on
its REST client. Production deployment requires both Upstash credentials; a
deployment smoke check must prove the protected route does not report the
limiter as unavailable.

### Reversible customer hold

Store a server-owned customer metadata object:

```json
{
  "security_hold": {
    "active": true,
    "reason": "checkout_abuse_2026_07_12",
    "placed_at": "2026-07-12T00:00:00.000Z"
  }
}
```

The timestamp above demonstrates the required ISO 8601 UTC wire format; the
script writes the actual application time. Only trusted administrative/server tooling may write this field. Browser
profile/cart metadata endpoints must not accept it.

After authentication succeeds, login checks the resolved customer before
setting the session cookie. A held customer receives a stable
`ACCOUNT_SECURITY_HOLD` domain error and no authenticated cookie. Account
resolution also checks the flag so a pre-existing session cannot retain access.
Held customers cannot create carts, payment sessions, complete carts, retrieve
licences, or download licensed files through the account surface.

Owner impersonation is explicitly exempt from the access denial because it is
read-only and authorizes using the real owner session. The impersonation banner
must visibly identify a held target.

A production remediation script marks exactly the three audited customer IDs.
It supports a dry run and an explicit apply mode, merges existing metadata, and
is idempotent. Removing the flag reverses the account hold; licence suspension
remains a separate Keygen operation.

### “View as” repair

Reproduce the failure using a suspicious customer ID and trace these boundaries:

1. exact-email admin lookup;
2. impersonation cookie write and redirect;
3. middleware account-scope header;
4. Medusa Admin customer lookup;
5. order/licence projection for a held customer.

The fix must address the observed failing boundary rather than weakening owner
authorization. Only the configured owner allowlist may start impersonation, and
all mutation guards remain active while viewing another account.

### Stripe controls

Repository work will document the incident evidence needed for the owner’s
Stripe review. Radar rules are operational changes and must be applied in the
Stripe Dashboard only after checking legitimate-payment impact. Recommended
controls are 3-D Secure for elevated risk, postal-code-failure handling, and
velocity rules, but this implementation does not silently activate them.

## Error handling and customer experience

- Invalid Turnstile: HTTP 403 with a stable bot-verification error code.
- Rate limit exhausted: HTTP 429 with the existing localized retry experience.
- Limiter unavailable: HTTP 503 with a stable temporary-unavailable error code;
  no Medusa or Stripe mutation occurs.
- Security hold: HTTP 403 with `ACCOUNT_SECURITY_HOLD`; copy directs the user to
  support without alleging fraud.
- Turnstile/Upstash logs include request category and coarse outcome only. They
  must not contain challenge tokens, passwords, card data, licence keys, or
  full email addresses.

## Testing

Use test-driven development for every behavior change.

- Unit tests for the limiter’s three outcomes and fail-closed route mapping.
- Registration route tests for missing, invalid, valid, and unavailable
  Turnstile verification plus unavailable/limited rate limiting.
- Payment-session route tests for per-IP and per-customer limiting and proof
  that Medusa is never called after denial.
- UI tests for token submission and challenge reset on rejection.
- Authentication/account tests proving a held account receives no session,
  existing sessions lose access, and owner impersonation remains read-only.
- Script tests for dry-run, exact-ID targeting, metadata merge, idempotency, and
  reversal semantics.
- A focused production smoke check after deployment followed by normal checkout
  health verification without creating a real charge.

## Rollout and rollback

1. Provision Upstash credentials in preview/staging and production before the
   fail-closed code reaches production.
2. Validate registration challenge and payment-session limits in staging.
3. Deploy application hardening.
4. Run the hold script in dry-run mode, compare the three IDs with incident
   evidence, then apply it in production.
5. Verify held-account login denial, owner “View as,” zero licence activations,
   and unchanged Stripe payment records.
6. Monitor registration, 403, 429, 503, and payment-session rates.

Rollback application code only if legitimate registration/checkout is blocked
after infrastructure health is confirmed. Account holds and licence suspensions
are independently reversible. Stripe records are never part of rollback.

## Success criteria

- A scripted registration without Turnstile cannot create an account.
- More than the configured registration or payment-session quota is denied
  before reaching Medusa/Stripe.
- Missing or failed Upstash denies only the protected mutations with HTTP 503.
- The three audited customers cannot authenticate or use existing sessions.
- The owner can inspect all three through read-only “View as.”
- Their three licences remain suspended with zero machines.
- No Stripe charge, order, or incident evidence is modified.
