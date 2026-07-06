# Translation Audit — 2026-07-06

## Scope

Audited `wcpos-com` and `wcpos-medusa` for:

- ambiguous date displays (`02/01/2021`-style numeric dates), receipts, and email dates;
- `next-intl` message coverage and locale parity;
- user-facing strings that are still hard-coded outside message files;
- Medusa email/admin template copy that is not currently localized.

## Date display findings and fixes

### Fixed in this branch

- `wcpos-com/src/lib/date-format.ts` now centralizes localized, unambiguous human date display with named months.
- `wcpos-com` account pages, order history, licenses, downloads, and PDF receipts already flow through the central helper or were switched to it.
- `wcpos-com` roadmap due dates now use the route locale instead of hard-coded English.
- `wcpos-medusa/src/lib/date-format.ts` adds the same named-month policy for emails/admin.
- `wcpos-medusa` order receipt emails and the license admin widget now use the central helper.

### Verification scans

After the fixes, direct date display APIs are only present inside central date helpers:

- `wcpos-com`: direct `Intl.DateTimeFormat` usage remains only in `src/lib/date-format.ts`.
- `wcpos-medusa`: direct `Intl.DateTimeFormat` usage remains only in `src/lib/date-format.ts`.
- No non-test source files in either repo contain `d/m/yyyy` or `m/d/yyyy` literal date strings.

## Translation coverage findings

### Message file parity

`wcpos-com` has message files for:

- `de`, `en`, `es`, `fr`, `it`, `ja`, `ko`, `nl`, `pt`, `zh`

Existing parity coverage passes:

- `messages/*.json` all contain 275 leaf messages.
- `src/i18n/messages-parity.test.ts` passes.

This means current translated namespaces are structurally complete, but it does **not** mean the whole site is translated.

### Major untranslated wcpos-com areas

The static scan found substantial user-facing copy in locale-routed pages/components that does not use `useTranslations` or `getTranslations` yet. Highest-impact areas:

1. **Marketing/homepage**
   - `src/app/[locale]/(main)/page.tsx`
   - `src/components/home/*`
   - `src/components/home/scroll-story/*`

2. **Downloads page and downloads components**
   - `src/app/[locale]/(main)/downloads/page.tsx`
   - `src/components/downloads/*`

3. **About page**
   - `src/app/[locale]/(main)/about-us/page.tsx`
   - `src/components/about/*`

4. **Legal/refund/support/roadmap pages**
   - `src/app/[locale]/(main)/privacy/page.tsx`
   - `src/app/[locale]/(main)/terms/page.tsx`
   - `src/app/[locale]/(main)/refunds/page.tsx`
   - `src/app/[locale]/(main)/support/page.tsx`
   - `src/app/[locale]/(main)/roadmap/page.tsx`
   - `src/components/roadmap/roadmap-timeline.tsx`
   - `src/components/support/*`

5. **Authentication flows**
   - `src/app/[locale]/(auth)/login/login-page-client.tsx`
   - `src/app/[locale]/(auth)/register/register-page-client.tsx`
   - `src/app/[locale]/(auth)/forgot-password/forgot-password-page-client.tsx`
   - `src/app/[locale]/(auth)/reset-password/reset-password-page-client.tsx`

6. **Checkout flows**
   - `src/app/[locale]/(main)/pro/checkout/page.tsx`
   - `src/app/[locale]/(main)/pro/checkout/success/page.tsx`
   - `src/components/pro/checkout-client.tsx`
   - `src/components/pro/checkout/*`
   - `src/components/pro/checkout-recovery.tsx`
   - `src/components/pro/*button.tsx`

7. **Global errors/not-found/admin utilities**
   - `src/app/[locale]/error.tsx`
   - `src/app/[locale]/not-found.tsx`
   - `src/app/[locale]/account/admin/page.tsx`

### Current translated areas

The account area and shared navigation/footer have meaningful `next-intl` coverage already, including:

- `src/components/main/site-header.tsx`
- `src/components/main/site-footer.tsx`
- `src/components/main/language-selector.tsx`
- `src/components/account/account-sidebar.tsx`
- `src/components/account/order-history-list.tsx`
- `src/components/account/licenses-client.tsx`
- `src/components/account/downloads-client.tsx`
- `src/components/account/profile-edit-form.tsx`
- server account pages using `getTranslations`

### Identical-to-English message values

Some non-English message values are identical to English. Many are acceptable brand/product/legal tokens (`WCPOS Pro`, `WordPress.org`, `ABN`, `Partita IVA`, copyright). A smaller number should be reviewed by translators, especially short navigation/status labels such as `Roadmap`, `Support`, `Downloads`, `Account`, `Status`, and `Avatar` in locales where those are not intended loanwords.

## Medusa findings

`wcpos-medusa` does not currently have a locale/message system for transactional emails or admin widget copy. All default email subjects/templates in `src/modules/resend/templates/index.ts` are English-only, including:

- order receipt;
- license key delivery;
- password reset;
- welcome email;
- admin invitation;
- order cancellation;
- shipment notification;
- owner alerts.

The order receipt date is now unambiguous, but the surrounding template copy remains English-only. A complete email i18n pass should introduce template data locale selection and translated template catalogs before translating these strings.

## Recommended follow-up plan

This date-format branch should not attempt a whole-site translation extraction because it would touch a large portion of the marketing, auth, checkout, support, and email surfaces. Recommended follow-up PRs:

1. **Marketing/downloads/about extraction** — move homepage, downloads, about, roadmap, support, legal, and refund copy into `messages/*.json`.
2. **Auth/checkout extraction** — move auth forms, checkout steps, payment/recovery errors, and checkout success copy into `messages/*.json`.
3. **Medusa email i18n design** — add a locale source for orders/customers, translated template catalogs, and tests for at least one non-English receipt.
4. **Translation quality review** — review identical-to-English message values and brand/legal exceptions with native speakers or a translation service.

## Hard-coded English source-string inventory

After feedback, this audit was expanded beyond message parity to search source code for hard-coded English literals anywhere they may become user-visible.

### Methodology

A TypeScript-aware scanner walked non-test source files and collected candidate English strings from:

- JSX text nodes;
- string literals;
- template literals, including HTML email templates;
- user-facing attributes such as `title`, `description`, `aria-label`, `alt`, `placeholder`, and `label`.

The scanner intentionally skips obvious imports, paths, CSS class strings, URLs, identifiers, HTTP method/config constants, generated/build directories, and test/spec files. It is still an audit heuristic: every candidate needs human triage before extraction, but it catches much more than grep.

### Full inventories

- `wcpos-com`: `HARDCODED_ENGLISH_AUDIT.csv` — 1,573 candidate hard-coded English literals.
- `wcpos-medusa`: companion PR includes `HARDCODED_ENGLISH_AUDIT.csv` — 568 candidate hard-coded English literals.

CSV columns:

- `file`
- `line`
- `col`
- `category`
- `attr`
- `text`

### wcpos-com category counts

- `route/page`: 538
- `component`: 751
- `code/string`: 196
- `error/status`: 77
- `admin`: 11

Largest `wcpos-com` source hotspots by candidate count:

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

Interpretation:

- The site is multilingual structurally, but large English copy surfaces are still embedded directly in source.
- The biggest customer-facing extraction priorities are legal pages, checkout, downloads, roadmap, home/about marketing, auth flows, and support chat.
- Some `code/string` and `error/status` hits are API/log/internal strings; they still need triage because some API errors are surfaced to users.

### wcpos-medusa category counts

- `email/template`: 197
- `code/string`: 299
- `error/status`: 57
- `admin`: 15

Largest `wcpos-medusa` source hotspots by candidate count:

| Count | File |
| ---: | --- |
| 96 | `src/modules/resend/templates/index.ts` |
| 52 | `src/subscribers/order-completed.ts` |
| 48 | `src/scripts/seed.ts` |
| 38 | `src/scripts/migrate-woocommerce/index.ts` |
| 31 | `src/modules/keygen/keygen-client.ts` |
| 31 | `src/scripts/seed-wcpos-products.ts` |
| 26 | `src/scripts/migrate-woocommerce/extract.ts` |
| 24 | `src/scripts/migrate-woocommerce/load-keygen.ts` |
| 22 | `src/scripts/migrate-woocommerce/test-extract.ts` |
| 22 | `src/subscribers/order-placed-email.ts` |
| 20 | `src/scripts/migrate-woocommerce/load-medusa.ts` |
| 16 | `src/modules/discord-auth/services/discord.ts` |
| 15 | `src/scripts/backfill-emailpass-identities.ts` |
| 13 | `src/api/store/carts/[id]/paypal/capture/route.ts` |
| 13 | `src/scripts/migrate-woocommerce/provision-logins.ts` |
| 11 | `src/admin/widgets/license-max-machines.tsx` |

Interpretation:

- Medusa has no translation framework for transactional emails/admin messages yet.
- `src/modules/resend/templates/index.ts` is the main customer-facing blocker: every default email template is English-only.
- Subscriber-generated HTML rows and email data strings are also English-only.
- Many script/migration hits are operator-facing and lower priority than transactional emails/admin UI, but they are inventoried for completeness.
