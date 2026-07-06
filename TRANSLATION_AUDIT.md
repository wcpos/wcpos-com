# Translation Audit — wcpos-com — 2026-07-07

## Summary

`wcpos-com` is multilingual structurally and already uses `next-intl`, but a TypeScript-aware source scan found many hard-coded English literals that still need extraction into message files.

## Existing i18n system

- Package: `next-intl`.
- Message catalogs: `messages/*.json`.
- Locales present: `de`, `en`, `es`, `fr`, `it`, `ja`, `ko`, `nl`, `pt`, `zh`.
- Existing parity test: `src/i18n/messages-parity.test.ts`.

## Full inventory

See `HARDCODED_ENGLISH_AUDIT.csv` for 1,573 candidate hard-coded English literals.

CSV columns: `file`, `line`, `col`, `category`, `attr`, `text`.

## Scanner methodology

The audit scanner collects candidate English strings from non-test source files:

- JSX text nodes;
- string literals;
- template literals;
- user-facing attributes such as `title`, `description`, `aria-label`, `alt`, `placeholder`, and `label`.

It skips obvious imports, paths, URLs, CSS classes, HTTP constants, identifiers, generated/build directories, and tests. Results are candidates and require human triage.

## Category counts

- `component`: 751
- `route/page`: 538
- `code/string`: 196
- `error/status`: 77
- `admin`: 11

## Largest hotspots

| Count | File |
| ---: | --- |
| 51 | `src/app/[locale]/(main)/privacy/page.tsx` |
| 42 | `src/components/pro/checkout-client.tsx` |
| 39 | `src/app/[locale]/(main)/terms/page.tsx` |
| 35 | `src/components/roadmap/roadmap-timeline.tsx` |
| 34 | `src/app/[locale]/(main)/downloads/page.tsx` |
| 34 | `src/components/roadmap/dev-fixture.ts` |
| 30 | `src/components/home/benefits-section.tsx` |
| 30 | `src/components/home/scroll-story/devices/pos-screen.tsx` |
| 27 | `src/components/about/story-timeline.tsx` |
| 26 | `src/components/pro/checkout/account-step.tsx` |
| 25 | `src/app/[locale]/(main)/refunds/page.tsx` |
| 25 | `src/components/pro/checkout-safety.ts` |
| 24 | `src/services/core/external/medusa-client.ts` |
| 23 | `src/app/[locale]/(auth)/login/login-page-client.tsx` |
| 21 | `src/components/account/profile-edit-form.tsx` |
| 21 | `src/components/pro/checkout-recovery.tsx` |

## Highest-priority extraction areas

1. Checkout and payment flows.
2. Auth flows and global errors.
3. Downloads and Pro marketing pages.
4. Homepage/about/support/roadmap UI.
5. Legal/refund content with review.
6. API/user-facing error strings after triage.
