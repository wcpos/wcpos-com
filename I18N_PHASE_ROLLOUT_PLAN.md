# Internationalization Phase Rollout Plan

## Goal

Make the entire WCPOS customer-facing website internationally translatable. All user-facing English copy should live in translation catalogs or an explicitly documented exception list.

## Current package choice

`wcpos-com` already uses `next-intl` with locale routing and message files under `messages/*.json`. Keep `next-intl`; the work is to finish migrating hard-coded copy into the existing system, not to switch libraries.

## Translation standard

Every user-facing string must be translatable unless it is one of these documented exceptions:

- brand/product/proper names (`WCPOS`, `WooCommerce`, `WordPress`, `GitHub`, `PayPal`, etc.);
- protocol/technical/legal tokens that intentionally remain unchanged (`REST API`, `GPL`, `ABN`, currency codes, version numbers);
- dynamic third-party/user-generated content;
- logs/operator-only diagnostics that are not exposed to customers.

Dates, numbers, and currency must use locale-aware formatters. Dates must be unambiguous for international audiences.

## Phase PR sequence

### Phase 0 — Audit and rollout plan

This PR.

Deliverables:

- Hard-coded English inventory: `HARDCODED_ENGLISH_AUDIT.csv`.
- Rollout plan and rules.
- No runtime behavior changes.

### Phase 1 — Guardrails and conventions

Deliverables:

- Add a maintained scanner script for hard-coded English source strings.
- Add an allowlist for accepted exceptions.
- Add CI checks for:
  - message key parity;
  - interpolation variable parity;
  - no numeric-only date display;
  - no newly introduced hard-coded English in guarded paths.
- Document namespace conventions, rich text translation patterns, pluralization, and date/number/currency formatting patterns.

### Phase 2 — Global shell, auth, and route chrome

Scope:

- layouts, metadata, not-found, error pages;
- login/register/forgot-password/reset-password;
- cookie consent and shared shell copy.

Why first:

- Low-to-medium complexity.
- Establishes reusable patterns for client/server components and metadata.

### Phase 3 — Checkout and account purchase flows

Scope:

- checkout page and steps;
- billing fields and validation messages;
- payment method copy;
- checkout recovery/safety errors;
- purchase success page.

Why high priority:

- Checkout copy affects conversion and customer trust.
- Error messages are especially problematic when left in English.

### Phase 4 — Marketing homepage, Pro, downloads, and support

Scope:

- homepage sections and scroll story;
- Pro marketing/pricing copy;
- downloads page/components/platform labels;
- support chat UI and Discord/support sections.

Notes:

- GitHub release notes can remain source-language initially unless translated release notes become a product requirement.

### Phase 5 — About, roadmap, legal, and refund content

Scope:

- about/founder/story pages;
- roadmap UI labels;
- privacy policy;
- terms of service;
- refund policy.

Notes:

- Legal/refund text should be translated carefully and reviewed, not blindly machine-translated.

### Phase 6 — Translation quality pass

Deliverables:

- Review identical-to-English values in non-English locale files.
- Native/fluent review for top target markets.
- Copy QA checklist for pages in each supported locale.

### Phase 7 — Medusa transactional email integration

Tracked in the companion `wcpos-medusa` phase plan.

## Review strategy

Keep PRs small enough to review:

- one phase per PR;
- each phase includes tests/checks relevant to its scope;
- avoid mixing copy extraction with unrelated UI changes;
- preserve existing English text as the initial `en` source before translating.

## Validation expectation per implementation phase

Each phase should run:

- `pnpm run lint`;
- `pnpm run type-check`;
- relevant unit tests;
- message parity checks;
- scanner/allowlist check;
- targeted e2e for migrated routes when practical.
