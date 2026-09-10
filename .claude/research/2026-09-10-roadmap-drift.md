# Roadmap drift measurement — Project #4, milestones, issue state, shipped releases

Research ticket: [wcpos/roadmap#179](https://github.com/wcpos/roadmap/issues/179) (map: [#178](https://github.com/wcpos/roadmap/issues/178))
Measured: 2026-09-10. Read-only — nothing was modified.

## Sources and method

- **GitHub Project #4** (`organization(login:"wcpos"){ projectV2(number:4) }`, GraphQL, header `GraphQL-Features: sub_issues`), paginated in 15 pages of 50: **728 items** (727 Issues + 1 DraftIssue). Captured per item: Status field, content type, repo, number, state, stateReason, closedAt, labels, milestone `{title, dueOn, state, description}`, parent, subIssuesSummary.
- **Milestones**: `repos/wcpos/<repo>/milestones?state=all&per_page=100` for `woocommerce-pos`, `woocommerce-pos-pro`, `monorepo`, `electron`, `roadmap` → **65 milestone records** across 5 repos (18 distinct titles).
- **Releases/tags**: `gh release list` + `repos/<r>/tags` per repo.
- **The page filter** is `src/services/core/external/github-roadmap.ts` in `wcpos-com`: keep issues that (a) have a milestone, (b) live in one of the five repos, (c) have no `parent`, (d) carry `enhancement`/`ui`/`epic`/`bug`, (e) whose project Status maps through `{Up Next → planned, In Progress → in_progress, Done → done}` (Triage/Backlog → dropped). Milestones are grouped by **title**; the first item met fixes that milestone's description/dueOn/state. Bucket: `closed` milestone → Shipped (top 2 by numeric title desc), else any `in_progress` item → Now, else Next.

### Release baseline (what has actually shipped)

| repo | latest tag | date | v1.11 tags |
|---|---|---|---|
| woocommerce-pos | v1.10.10 | 2026-09-09 | none |
| woocommerce-pos-pro | v1.10.10 | 2026-09-09 | none |
| monorepo | v1.10.9 | 2026-09-09 | none |
| electron | v1.10.10 | 2026-09-09 | none |
| roadmap | *(no releases)* | — | — |

So: anything closed against `v1.10.0` **has shipped** (the 1.10 line ran v1.10.0 on 2026-08-25 through v1.10.10 on 2026-09-09). Anything closed against `v1.11.0` is **merged on `next` and unreleased** — no `v1.11.*` tag exists in any repo.

---

## 1. Count matrix — Status × issue state

All 727 issue items in Project #4 (the single DraftIssue sits in Backlog and is excluded):

| Status | OPEN | CLOSED | total |
|---|---:|---:|---:|
| Triage | 136 | 427 | 563 |
| Backlog | 51 | 49 | 100 |
| Done | 0 | 48 | 48 |
| Up Next | 5 | 3 | 8 |
| In Progress | 3 | 5 | 8 |
| **total** | **195** | **532** | **727** |

Closed items by `stateReason`:

| Status | COMPLETED | NOT_PLANNED | DUPLICATE |
|---|---:|---:|---:|
| Triage | 420 | 7 | 0 |
| Backlog | 8 | 40 | 1 |
| Done | 43 | 3 | 2 |
| In Progress | 5 | 0 | 0 |
| Up Next | 3 | 0 | 0 |

**Headline drift:** 532 issues are closed; 48 carry Status `Done`. **484 closed issues (91%) are not in Done** — 436 of them closed as COMPLETED. The board lane and the issue state are effectively unrelated variables.

Two more shape facts that drive everything below:
- Only **144 of 728** project items carry a milestone at all (`v1.11.0` 51, `v1.10.0` 43, `Backlog` 26, `Compliance / Fiscalization` 16, `v1.9.x` 4, `2026.4` 2, `2026.5` 1, `v2.0.0` 1).
- Only **12 items pass the full page filter today**; 37 pass every gate except Status.

---

## 2. Every CLOSED issue not in Done

484 items. Of those, **85 carry a milestone** (the only ones the page could ever surface) and 399 do not. The 85 are listed in full here; the complete 484-row list is Appendix A.

Breakdown of the 484: by repo — monorepo 278, woocommerce-pos 123, roadmap 59, woocommerce-pos-pro 17, electron 7. By status — Triage 427, Backlog 49, In Progress 5, Up Next 3. 142 are sub-issues; 91 carry a public label.

### 2a. The 8 board-lane cases (closed while sitting in Up Next / In Progress)

These are the ones that make the page say "0 of 6 done" for a shipped milestone.

| item | title | closedAt | Status | milestone | shipped? |
|---|---|---|---|---|---|
| monorepo#40 | Settings form labels don't re-render after language change | 2026-08-14 | In Progress | v1.10.0 | yes (1.10 line) |
| monorepo#42 | Block adding out-of-stock items to cart | 2026-08-13 | Up Next | v1.10.0 | yes |
| monorepo#163 | POS stops reading SKU/barcodes when `could not requestRemote` / `bulkWrite` sync error appears | 2026-08-13 | In Progress | v1.10.0 | yes |
| monorepo#165 | Offline queue: email, order sync, customer sync | 2026-08-13 | In Progress | v1.10.0 | yes |
| monorepo#323 | Security P0: remove vendored Google API key and stop tracking node_modules | 2026-08-05 | In Progress | v1.10.0 | yes |
| roadmap#1 | Prevent overselling at POS | 2026-09-06 | Up Next | v1.10.0 | yes |
| woocommerce-pos#443 | Server-side stock validation on order creation | 2026-08-13 | Up Next | v1.10.0 | yes |
| woocommerce-pos#465 | Barcode scan: online fallback with auto-add | 2026-08-05 | In Progress | v1.10.0 | yes |

Five of these eight are visible on the page right now and are rendered as not-done: `monorepo#40`, `#163`, `#165`, `roadmap#1`, `woocommerce-pos#465`. The other three are already dropped for other reasons (`#42` and `#443` are sub-issues, `#323` has no public label).

### 2b. The remaining 77 closed-not-Done items that carry a milestone

| item | title | closedAt | Status | milestone |
|---|---|---|---|---|
| monorepo#54 | Split payment checkout UI | 2026-08-22 | Backlog | Backlog |
| monorepo#55 | Product Add-Ons field rendering in cart | 2026-08-22 | Backlog | Backlog |
| monorepo#57 | Cash float entry UI | 2026-08-22 | Backlog | Backlog |
| monorepo#58 | Search field configuration UI | 2026-08-22 | Backlog | Backlog |
| monorepo#59 | Shift management UI | 2026-08-22 | Backlog | Backlog |
| monorepo#60 | Order notification UI and audio alerts | 2026-08-22 | Backlog | Backlog |
| monorepo#61 | Product Bundles cart UI | 2026-08-22 | Backlog | Backlog |
| monorepo#62 | Composite product configuration UI | 2026-08-22 | Backlog | Backlog |
| monorepo#63 | Sort option picker UI | 2026-08-22 | Backlog | Backlog |
| monorepo#65 | Embedded barcode parsing and cart integration | 2026-08-22 | Backlog | Backlog |
| monorepo#67 | Bookable product date/time picker UI | 2026-08-22 | Backlog | Backlog |
| monorepo#68 | Vendor display and filtering in POS | 2026-08-22 | Backlog | Backlog |
| monorepo#69 | Plugin Republic Add-Ons field rendering | 2026-08-22 | Backlog | Backlog |
| monorepo#70 | Product Options field rendering in cart | 2026-08-22 | Backlog | Backlog |
| monorepo#71 | HID card reader input handling | 2026-08-22 | Backlog | Backlog |
| monorepo#72 | Customer display broadcast from POS | 2026-08-22 | Backlog | Backlog |
| monorepo#536 | Cloud Print: client order-based upload for Epson/PrintNode manual print | 2026-08-13 | Backlog | Backlog |
| monorepo#673 | POS Product Tile: show variation-level stock quantities | 2026-08-23 | Triage | Backlog |
| monorepo#720 | POS products: hide out-of-stock variations per the display setting | 2026-08-13 | Triage | Backlog |
| monorepo#740 | UPC-A ↔ EAN-13 barcode equivalence in the shared resolve/lookup layer | 2026-08-13 | Triage | Backlog |
| monorepo#742 | Electron main-process device handlers for serial/HID scanners | 2026-08-13 | Triage | Backlog |
| monorepo#976 | Test gap: guest per-user coupon usage limits have no coverage | 2026-08-22 | Triage | Backlog |
| woocommerce-pos#857 | Free: store.tax_ids[] admin UI + iterate tax_ids in bundled gallery templates | 2026-08-13 | Backlog | Compliance / Fiscalization |
| monorepo#679 | Search can't match compound words (tokenize: 'forward' misses mid-word substrings) | 2026-08-04 | Triage | v1.10.0 |
| monorepo#750 | Customer search with a space (full name) returns no results from the server | 2026-08-04 | Triage | v1.10.0 |
| monorepo#818 | sync-engine: update queued during an in-flight order create still pushes ID-less line_items | 2026-08-13 | Triage | v1.10.0 |
| monorepo#832 | sync: dead-lettered push mutations (status 'rejected') have no recovery path | 2026-08-13 | Triage | v1.10.0 |
| monorepo#850 | dev-next: fresh-profile initial sync unhealthy — customers 0/5,002, products stall at 109/209 | 2026-08-13 | Triage | v1.10.0 |
| monorepo#863 | Dropdowns don't open on iPad (iPadOS 18.7.8) — app-wide, all browsers are WebKit | 2026-08-14 | Triage | v1.10.0 |
| monorepo#894 | POS browse stalls at partial catalog on fresh profile: shows '18 de 18' in-stock while server has 62 | 2026-08-13 | Triage | v1.10.0 |
| monorepo#946 | Order sync reads dropped 1.9's dp=6 precision — pulled orders arrive rounded to display decimals | 2026-08-13 | Triage | v1.10.0 |
| monorepo#947 | Product grid sorts with no wc/v3 equivalent silently fall back to the default browse window | 2026-08-14 | Triage | v1.10.0 |
| monorepo#948 | Product browse scrolling hard-caps at 1,000 records (1.9 paged indefinitely) | 2026-08-13 | Triage | v1.10.0 |
| monorepo#949 | Carry over 1.9's performance contracts as engine tests | 2026-08-13 | Triage | v1.10.0 |
| monorepo#950 | Typed variation search creates no remote demand — variation SKU/name search is local-residents-only | 2026-08-05 | Triage | v1.10.0 |
| monorepo#951 | Customers browse: cold grid + sort shows a partial, misleadingly-ordered set | 2026-08-13 | Triage | v1.10.0 |
| monorepo#952 | Reference lanes: fetch categories/tags/brands/coupons on demand (1.9 model), not at boot | 2026-08-13 | Triage | v1.10.0 |
| monorepo#954 | Ranged report fetches cannot converge past the 10,000-record runaway backstop | 2026-08-13 | Triage | v1.10.0 |
| monorepo#956 | sync-engine: ledger recovery cannot be triggered by a schedulerTaskStates reconciliation refusal | 2026-08-13 | Triage | v1.10.0 |
| monorepo#957 | Orders browse scrolling hard-caps at 200 records | 2026-08-13 | Triage | v1.10.0 |
| monorepo#961 | Sync scripts/opfs-targeted-recovery.mjs with electron 556434b and bump the electron pin on next | 2026-08-13 | Triage | v1.10.0 |
| monorepo#1004 | 1.9→1.10 local-data upgrade path is unwired and untested — purgeLegacyDatabases has zero callers | 2026-08-05 | Triage | v1.10.0 |
| monorepo#1012 | E2E: pos-checkout.spec.ts is flaky (process-payment-button element-not-found) | 2026-08-13 | Triage | v1.10.0 |
| woocommerce-pos#585 | Document POS line item pricing storage for third-party sync compatibility | 2026-08-05 | Backlog | v1.10.0 |
| woocommerce-pos#1075 | POS REST routes not registered without `X-WCPOS` header → `rest_no_route` 404 | 2026-08-13 | Backlog | v1.10.0 |
| woocommerce-pos#1322 | Change_Log: unbounded growth — needs retention/compaction | 2026-08-13 | Triage | v1.10.0 |
| woocommerce-pos#1341 | Decide the fate of the fixed-layout output adapter family for Star printers | 2026-08-14 | Triage | v1.10.0 |
| woocommerce-pos#1362 | Print queue: a retried failure stays in "Needs attention" and can be retried again | 2026-08-14 | Triage | v1.10.0 |
| woocommerce-pos#1406 | Graduate the /wcpos/v2/changes surface out of lab-candidate vocabulary | 2026-08-13 | Triage | v1.10.0 |
| woocommerce-pos#1407 | Response_Telemetry: is_change_candidate_route should be a prefix check on changes/ | 2026-08-13 | Triage | v1.10.0 |
| woocommerce-pos#1434 | Cash gateway renders order money in the site default currency | 2026-08-14 | Triage | v1.10.0 |
| woocommerce-pos#1437 | Receipt_Date_Formatter leaves a stray space before punctuation | 2026-08-14 | Triage | v1.10.0 |
| woocommerce-pos#1456 | v2 push order-totals parity: ranked gaps vs the v1 calculation machinery (1.10.0 blocker) | 2026-08-07 | Triage | v1.10.0 |
| woocommerce-pos#1514 | v2 catalog capability enforcement follow-ups from PR #1501 review | 2026-08-14 | Triage | v1.10.0 |
| woocommerce-pos#1560 | Two change logs: fold `sync_index` (orders) into `change_log`, or justify keeping them apart | 2026-08-22 | Triage | v1.10.0 |
| woocommerce-pos#1561 | Dev servers keep stale role capabilities: Activator re-syncs only on a version bump | 2026-08-14 | Triage | v1.10.0 |
| woocommerce-pos#1573 | perf(next): integrity scan recomputes full-table live digests on every request | 2026-08-14 | Triage | v1.10.0 |
| monorepo#251 | Excessive re-renders in cart Totals component *(NOT_PLANNED)* | 2026-08-22 | Backlog | v1.11.0 |
| monorepo#727 | Fix infinite scan toast when cart add returns false | 2026-08-13 | Triage | v1.11.0 |
| monorepo#739 | Attributed-wedge registration can capture an ordinary keyboard | 2026-08-13 | Triage | v1.11.0 |
| monorepo#752 | Order search by customer name isn't robust to word order (multi-word) | 2026-09-03 | Triage | v1.11.0 |
| monorepo#753 | Product search OR-joins terms; app's local search AND-joins (relevance mismatch) | 2026-09-03 | Triage | v1.11.0 |
| monorepo#811 | next: malformed variation attributes reach the UI unguarded | 2026-08-14 | Triage | v1.11.0 |
| monorepo#884 | logging: foundation hardening — six confirmed review findings | 2026-08-13 | Triage | v1.11.0 |
| monorepo#885 | sync-engine: born-twice requeue skips the residual-meta sanitizer | 2026-08-13 | Triage | v1.11.0 |
| monorepo#886 | scheduler: menu_order tie-walk is unbounded on all-zero catalogs | 2026-08-13 | Triage | v1.11.0 |
| monorepo#887 | sync-engine: late barcode-selector install never re-materializes bootstrap records | 2026-08-13 | Triage | v1.11.0 |
| monorepo#888 | customers: unresolved-demand refetch churn + trickle cursor race | 2026-08-13 | Triage | v1.11.0 |
| monorepo#902 | Login within ~2s of connecting a new site loses the site↔credential link | 2026-08-13 | Triage | v1.11.0 |
| monorepo#1785 | feat(pos): setting to put the products panel on the left or right of the cart | 2026-09-03 | Triage | v1.11.0 |
| roadmap#139 | Decide the slot primitive v1: two first-party consumers on next for 1.11.0 | 2026-09-02 | Triage | v1.11.0 |
| roadmap#140 | Research: extensible React Native app architectures | 2026-09-02 | Triage | v1.11.0 |
| woocommerce-pos#1862 | POS Only products should force WooCommerce catalog visibility to Hidden | 2026-09-08 | Triage | v1.11.0 |
| woocommerce-pos#1868 | 1.11.0 boundary: protocol gate on the wcpos/v2 sync surface (426 wcpos_update_required) | 2026-09-05 | Triage | v1.11.0 |
| woocommerce-pos#1869 | 1.11.0 boundary: variations bare envelope + content-hash revision | 2026-09-05 | Triage | v1.11.0 |
| woocommerce-pos#1870 | 1.11.0 boundary: schema-scoped order revision recipe + /orders/pull checkpoint unification | 2026-09-06 | Triage | v1.11.0 |
| woocommerce-pos-pro#292 | Integration: capture customer & sync to email marketing (Mailchimp / Klaviyo) *(NOT_PLANNED)* | 2026-08-23 | Backlog | v1.11.0 |

The remaining **399** closed-not-Done items have no milestone, so no status model can surface them without a milestone backfill. Appendix A lists all 484.

---

## 3. Every OPEN issue in Done

**Zero.** No item in Project #4 has Status `Done` while its issue is open. The drift is entirely one-directional: issues close, the board never follows.

Related fact worth carrying into the decision: of the 48 `Done` items, **42 have no milestone at all** and are therefore invisible to the page regardless. Only 7 carry one (`monorepo#90` and `roadmap#22` → 2026.4; `woocommerce-pos#446` → 2026.5; `woocommerce-pos#597`, `#763`, `#773` → v1.9.x; `monorepo#509` → v1.11.0). `monorepo#509` is Done, closed and milestoned but still dropped by the page because it carries no public label.

---

## 4. Milestone titles whose metadata differs across repos

18 distinct titles across the 5 repos, 65 records. Every shared title diverges on `dueOn`. Descriptions diverge on the two live release milestones. No title diverges on `state`.

### The two that matter — live release milestones

**`v1.10.0`** — 4 repos, 2 due-date variants, 2 description variants, all open:

| repo | dueOn | open/closed issues | description |
|---|---|---|---|
| monorepo | 2026-06-30 | 0 / 25 | "Offline & stock-state correctness: offline queues, overselling prevention, barcode reliability. Monthly dot-release cadence." |
| woocommerce-pos | 2026-06-30 | 0 / 16 | *(same as monorepo)* |
| woocommerce-pos-pro | 2026-06-30 | 0 / 0 | *(same as monorepo)* |
| **roadmap** | **2026-08-24** | 1 / 1 | "Offline & stock-state correctness: **sync engine overhaul with queuing**, offline queues, overselling prevention, barcode reliability. Monthly dot-release cadence." |

Not present in `electron` at all. Note every code repo has **zero open issues** in `v1.10.0` — the milestone is materially finished, and the 1.10 line has shipped to v1.10.10, yet the milestone is still `open` in all four repos.

**`v1.11.0`** — 4 repos, 3 due-date variants, 2 description variants, all open:

| repo | dueOn | open/closed issues | description |
|---|---|---|---|
| monorepo | 2026-07-31 | 18 / 14 | "Checkout & payments. Monthly dot-release cadence." |
| woocommerce-pos | 2026-07-31 | 1 / 5 | *(same)* |
| woocommerce-pos-pro | **2026-07-30** | 0 / 1 | *(same)* |
| **roadmap** | **2026-09-14** | 11 / 2 | "Checkout & payments: **split payments, checkout conditions**. Monthly dot-release cadence." |

Three of the four due dates are already in the past. Because the page keys by title and keeps whichever record it meets first in project-item order, the date and blurb shown for `v1.10.0` / `v1.11.0` are arbitrary — a function of item ordering, not of any decision.

### Titles that agree

- `Compliance / Fiscalization` — woocommerce-pos + woocommerce-pos-pro, both due 2026-12-31, identical description. The only shared title with no divergence.
- Single-repo titles (no divergence possible): `Backlog` (monorepo, open, no due date), `v2.0.0` (monorepo, open, no due date), `v2` (woocommerce-pos, closed).
- `v1.9.x` — monorepo + woocommerce-pos, both closed, both no due date, identical description ("Stabilization patches for the 1.9 line (rolling patch lane).").

### The dead sprint train

`2026.1` … `2026.10` exist in **all five** repos (50 records), all closed, all with empty descriptions, and every one of them carries a different due date per repo:

| title | due-date variants | per-repo dates (electron / monorepo / roadmap / woocommerce-pos / woocommerce-pos-pro) |
|---|---:|---|
| 2026.1 | 1 | 02-03 / 02-03 / 02-03 / 02-03 / 02-03 |
| 2026.2 | 2 | 03-20 / 02-05 / 02-05 / 02-05 / 02-05 |
| 2026.3 | 3 | 04-03 / 03-20 / 02-12 / 02-12 / 03-20 |
| 2026.4 | 4 | 04-17 / 04-03 / 02-19 / 03-20 / 04-03 |
| 2026.5 | 4 | 05-01 / 04-17 / 02-26 / 04-03 / 04-17 |
| 2026.6 | 2 | 03-13 / 03-13 / 03-05 / 03-13 / 03-13 |
| 2026.7 | 2 | 03-27 / 03-27 / 03-12 / 03-27 / 03-27 |
| 2026.8 | 2 | 04-10 / 04-10 / 03-19 / 04-10 / 04-10 |
| 2026.9 | 3 | 04-24 / 04-24 / 03-26 / 04-17 / 04-24 |
| 2026.10 | 4 | 05-08 / 05-01 / 04-02 / 04-24 / 05-01 |

Only 6 issues in Project #4 still point at any `2026.x` milestone, but two of them (`monorepo#90`, `roadmap#22`, both `2026.4`) are exactly what keeps the dead sprint train on the public page as a "Shipped" card.

---

## 5. Items whose milestone is closed but Status ≠ Done

**One.**

| item | title | issue state | Status | milestone | milestone state |
|---|---|---|---|---|---|
| woocommerce-pos#1096 | Cloud Print: manual Epson SDP printing of HTML/logic-less templates | OPEN | Backlog | v1.9.x | closed |

It carries no public label, so it is not on the page. Seven project items sit in a closed milestone in total; the other six are all Status `Done` and all closed (`roadmap#22`, `monorepo#90` → 2026.4; `woocommerce-pos#446` → 2026.5; `woocommerce-pos#597`, `#763`, `#773` → v1.9.x).

This axis is *not* where the drift lives — closed milestones are near-empty. The drift lives in the two **open** milestones (`v1.10.0`, `v1.11.0`) whose work has already shipped or merged.

---

## 6. Items carrying a public label but no milestone

**127 items** in the five repos have `enhancement`/`ui`/`epic`/`bug` and no milestone — invisible to the page purely for want of a milestone.

By repo: roadmap 53, woocommerce-pos 33, monorepo 27, electron 8, woocommerce-pos-pro 6.
By state: OPEN 65, CLOSED 62.
By Status: Triage 71, Backlog 47, Done 8, In Progress 1, Up Next 0.

Of the 65 open ones, 41 are Triage and 23 are Backlog — so a milestone backfill alone would not surface them either; they would still fail the Status gate. Exactly **one** open, publicly-labelled, milestone-less item already has a page-eligible Status:

| item | title | Status | labels |
|---|---|---|---|
| woocommerce-pos#1152 | Perf: preconnect/preload landing assets on the POS welcome screen | In Progress | enhancement |

Add a milestone to that single issue and the page gains an item — and, since it is In Progress, potentially flips that milestone into the "Now" bucket. That is how thin the current input is.

For completeness on the other side: 8 of the 48 `Done` items carry a public label but no milestone (`monorepo#538`, `#627`, `roadmap#4`, `woocommerce-pos#673`, `#961`, `#1157`, `woocommerce-pos-pro#83`, `#293`).

---

## 7. The `v1.11.0` items the page drops, and why

**51 project items** carry the `v1.11.0` milestone. The page shows **2**; it drops **49**.

Shown:

| item | Status | state | title |
|---|---|---|---|
| roadmap#3 | Up Next | OPEN | Split payment support |
| roadmap#91 | Up Next | OPEN | Quick discount at the till via an on-the-fly coupon |

Dropped — the reason, per item (an item can fail more than one gate; all failing gates are listed):

| item | state | drop reason(s) |
|---|---|---|
| monorepo#241 | OPEN | Status=Backlog |
| monorepo#249 | OPEN | Status=Backlog |
| monorepo#251 | CLOSED | Status=Backlog |
| monorepo#509 | CLOSED | no public label *(Status is Done)* |
| monorepo#647 | OPEN | no public label + Status=Triage |
| monorepo#666 | OPEN | no public label + Status=Triage |
| monorepo#676 | OPEN | Status=Triage |
| monorepo#684 | OPEN | no public label + Status=Triage |
| monorepo#727 | CLOSED | no public label + Status=Triage |
| monorepo#739 | CLOSED | Status=Triage |
| monorepo#752 | CLOSED | no public label + Status=Triage |
| monorepo#753 | CLOSED | no public label + Status=Triage |
| monorepo#811 | CLOSED | no public label + Status=Triage |
| monorepo#819 | OPEN | no public label + Status=Triage |
| monorepo#846 | OPEN | no public label + Status=Triage |
| monorepo#852 | OPEN | no public label + Status=Triage |
| monorepo#884 | CLOSED | no public label + Status=Triage |
| monorepo#885 | CLOSED | no public label + Status=Triage |
| monorepo#886 | CLOSED | no public label + Status=Triage |
| monorepo#887 | CLOSED | no public label + Status=Triage |
| monorepo#888 | CLOSED | no public label + Status=Triage |
| monorepo#891 | OPEN | no public label + Status=Triage |
| monorepo#892 | OPEN | no public label + Status=Triage |
| monorepo#900 | OPEN | no public label + Status=Triage |
| monorepo#902 | CLOSED | no public label + Status=Triage |
| monorepo#1017 | OPEN | no public label + Status=Triage |
| monorepo#1488 | OPEN | no public label + Status=Triage |
| monorepo#1523 | OPEN | Status=Triage |
| monorepo#1785 | CLOSED | Status=Triage |
| monorepo#1857 | OPEN | no public label + Status=Triage |
| monorepo#1901 | OPEN | no public label (`question`) + Status=Triage |
| monorepo#1932 | OPEN | Status=Triage |
| roadmap#63 | OPEN | Status=Triage *(Quick filter buttons)* |
| roadmap#93 | OPEN | Status=Triage |
| roadmap#96 | OPEN | Status=Triage |
| roadmap#129 | OPEN | sub-issue of roadmap#120 + no public label (`wayfinder:task`) + Status=Triage |
| roadmap#139 | CLOSED | no public label (`wayfinder:grilling`) + Status=Triage |
| roadmap#140 | CLOSED | no public label (`wayfinder:research`) + Status=Triage |
| roadmap#157 | OPEN | sub-issue of roadmap#120 + no public label (`wayfinder:task`) + Status=Triage |
| roadmap#158 | OPEN | sub-issue of roadmap#120 + no public label (`wayfinder:task`) + Status=Triage |
| roadmap#160 | OPEN | sub-issue of roadmap#120 + no public label (`wayfinder:task`) + Status=Triage |
| roadmap#168 | OPEN | no public label + Status=Triage |
| roadmap#177 | OPEN | Status=Triage |
| woocommerce-pos#1752 | OPEN | no public label + Status=Triage |
| woocommerce-pos#1862 | CLOSED | Status=Triage |
| woocommerce-pos#1868 | CLOSED | no public label (`php`) + Status=Triage |
| woocommerce-pos#1869 | CLOSED | no public label (`php`) + Status=Triage |
| woocommerce-pos#1870 | CLOSED | no public label (`php`) + Status=Triage |
| woocommerce-pos-pro#292 | CLOSED | Status=Backlog |

Tally of drop causes across the 49:

| cause | items failing this gate | items failing **only** this gate |
|---|---:|---:|
| Status not in {Up Next, In Progress, Done} | 48 | 14 |
| no public label | 35 | 1 (`monorepo#509`) |
| sub-issue (parent set) | 4 | 0 |

Status mix of the 49 dropped: Triage 44, Backlog 4, Done 1 (`monorepo#509`, which is dropped on the label gate instead).

**The Status gate is the binding constraint.** 48 of the 49 dropped items fail it, and 14 fail nothing else — those 14 would appear immediately if the Status gate were removed or relaxed (`monorepo#241`, `#249`, `#251`, `#676`, `#739`, `#1523`, `#1785`, `#1932`, `roadmap#63`, `#93`, `#96`, `#177`, `woocommerce-pos#1862`, `woocommerce-pos-pro#292`). Fixing labels alone takes the card from 2 items to 3. Removing the Status gate while keeping the public-label rule takes it to 16 (see §8); the narrower "closed-or-planned" model in §8 takes it to 7.

---

## 8. What the page would show if Done were derived from issue state alone

Model tested: keep every current gate (milestone, allowed repo, no parent, public label) but replace the Status gate with — *include if the issue is CLOSED, or if Status is Up Next / In Progress*; `done` = issue CLOSED; `in_progress` = OPEN and Status `In Progress`. Bucketing is unchanged (milestone `state` decides Shipped, an in_progress item decides Now).

**Today (12 items, 5 milestone cards):**

| milestone | bucket | progress |
|---|---|---|
| v1.10.0 | Now | 0 / 6 done |
| Compliance / Fiscalization | Next | 0 / 1 done |
| v1.11.0 | Next | 0 / 2 done |
| v1.9.x | Shipped | 1 / 1 done |
| 2026.4 | Shipped | 2 / 2 done |

**With Done derived from issue state (26 items, 6 milestone cards):**

| milestone | bucket | progress | change |
|---|---|---|---|
| v1.10.0 | Now | **9 / 10 done** | was 0/6 |
| v1.11.0 | Next | **5 / 7 done** | was 0/2 |
| Compliance / Fiscalization | Next | **1 / 2 done** | was 0/1 |
| Backlog | Next | **4 / 4 done** | new card — 4 closed monorepo items in the `Backlog` milestone |
| v1.9.x | Shipped | 1 / 1 done | unchanged |
| 2026.4 | Shipped | 2 / 2 done | unchanged |

Notes on that shape:

- `v1.10.0` stays in **Now** even though 9 of its 10 items are closed and the whole 1.10 line has shipped, because `roadmap#41` ("Sync engine & offline overhaul: queuing architecture") is open and In Progress, and because the **milestone itself is still open in all four repos**. Deriving `done` from issue state fixes the *counts* but does not fix the *bucket* — the bucket is a function of milestone state, which is stale in a different way.
- `v1.11.0` reads 5/7 done, but none of those five have shipped to users: no `v1.11.*` tag exists in any repo. A state-derived model conflates "merged on `next`" with "shipped".
- A new "Backlog" card appears — the literal `Backlog` milestone in `monorepo`, which is a triage bucket, not a release. Its description says so: "Feature roadmap / no version commitment — triaged out of the release lanes 2026-08-05". Any state-derived model needs a milestone allow/deny rule or this leaks onto the public page.
- The Shipped bucket is unaffected — it is still `v1.9.x` and the dead `2026.4`, because those are the only two closed milestones any surviving item points at.

**Variant — drop the Status gate entirely** (base eligibility only: milestone + repo + no parent + public label). 37 items, 7 cards:

| milestone | done / total | Status mix |
|---|---|---|
| v1.10.0 | 9 / 10 | In Progress 5, Up Next 1, Triage 4 |
| v1.11.0 | 5 / 16 | Triage 10, Backlog 4, Up Next 2 |
| Backlog | 4 / 5 | Triage 4, Backlog 1 |
| Compliance / Fiscalization | 1 / 2 | Up Next 1, Backlog 1 |
| 2026.4 | 2 / 2 | Done 2 |
| v1.9.x | 1 / 1 | Done 1 |
| v2.0.0 | 0 / 1 | Backlog 1 |

This is the widest honest view of the current data: 37 items. It also drags in `v2.0.0` ("Tablet-first UI refresh (vision; not yet scheduled)") and the 11 open `v1.11.0` items that are currently in Triage — which is a scope/curation question, not a status question.

---

## Implications

The drift is one-directional and near-total: 484 of 532 closed issues (91%) are not in Done, no Done item is open, and the single largest cause of a wrong page is that closing an issue never touches the board. Deriving done-ness from issue state closes most of the count gap immediately — `v1.10.0` goes from "0 of 6" to "9 of 10", `v1.11.0` from "0 of 2" to "5 of 7" — with no board cleanup at all, and it is the only lever that does not require 700 manual field edits. But it does not close the whole gap: bucketing (Now / Next / Shipped) reads the *milestone* state, and the milestone state is stale in its own right — `v1.10.0` is open in all four repos with zero open issues after the 1.10 line shipped to v1.10.10, which is why a state-derived `v1.10.0` still renders as "Now". Three further constraints belong in the decision: the milestone is a per-repo object with five divergent copies keyed only by title, so due date and description on the page are currently decided by item ordering; "closed" is not "shipped", as the five closed `v1.11.0` items prove (merged on `next`, no tag anywhere); and 127 publicly-labelled items have no milestone at all, so any model keyed on milestones is reading a 144-of-728 slice of the board regardless of how done-ness is computed.

---

## Appendix A — all 484 closed issues not in Done

<details>
<summary>Full list (repo#number, title, closedAt, Status, milestone) — sorted by Status, then repo, then number</summary>

| item | title | closedAt | Status | milestone |
|---|---|---|---|---|
| electron#135 | ESC/POS thermal printer integration | 2026-08-22 | Backlog | — |
| electron#136 | Encrypted card reader SDK integration | 2026-08-22 | Backlog | — |
| electron#137 | Customer-facing display application | 2026-08-22 | Backlog | — |
| monorepo#49 | Required fields before checkout | 2026-07-09 | Backlog | — |
| monorepo#54 | Split payment checkout UI | 2026-08-22 | Backlog | Backlog |
| monorepo#55 | Product Add-Ons field rendering in cart | 2026-08-22 | Backlog | Backlog |
| monorepo#56 | Report viewer and printer UI | 2026-07-23 | Backlog | — |
| monorepo#57 | Cash float entry UI | 2026-08-22 | Backlog | Backlog |
| monorepo#58 | Search field configuration UI | 2026-08-22 | Backlog | Backlog |
| monorepo#59 | Shift management UI | 2026-08-22 | Backlog | Backlog |
| monorepo#60 | Order notification UI and audio alerts | 2026-08-22 | Backlog | Backlog |
| monorepo#61 | Product Bundles cart UI | 2026-08-22 | Backlog | Backlog |
| monorepo#62 | Composite product configuration UI | 2026-08-22 | Backlog | Backlog |
| monorepo#63 | Sort option picker UI | 2026-08-22 | Backlog | Backlog |
| monorepo#65 | Embedded barcode parsing and cart integration | 2026-08-22 | Backlog | Backlog |
| monorepo#67 | Bookable product date/time picker UI | 2026-08-22 | Backlog | Backlog |
| monorepo#68 | Vendor display and filtering in POS | 2026-08-22 | Backlog | Backlog |
| monorepo#69 | Plugin Republic Add-Ons field rendering | 2026-08-22 | Backlog | Backlog |
| monorepo#70 | Product Options field rendering in cart | 2026-08-22 | Backlog | Backlog |
| monorepo#71 | HID card reader input handling | 2026-08-22 | Backlog | Backlog |
| monorepo#72 | Customer display broadcast from POS | 2026-08-22 | Backlog | Backlog |
| monorepo#251 | Excessive re-renders in cart Totals component | 2026-08-22 | Backlog | v1.11.0 |
| monorepo#255 | Branch Hygiene | 2026-08-19 | Backlog | — |
| monorepo#489 | v2 product edits fail catalogue-wide: push echoes cost_of_goods_sold null (40... | 2026-08-14 | Backlog | — |
| monorepo#536 | Cloud Print: client order-based upload for Epson/PrintNode manual print | 2026-08-13 | Backlog | Backlog |
| woocommerce-pos#448 | Split payment sub-order handling | 2026-08-22 | Backlog | — |
| woocommerce-pos#449 | Expose Product Add-Ons data via REST API | 2026-08-22 | Backlog | — |
| woocommerce-pos#450 | Report data aggregation API | 2026-08-22 | Backlog | — |
| woocommerce-pos#451 | Cash float REST API and storage | 2026-08-22 | Backlog | — |
| woocommerce-pos#452 | Configurable search fields in REST API | 2026-08-22 | Backlog | — |
| woocommerce-pos#453 | Shift management REST API | 2026-08-22 | Backlog | — |
| woocommerce-pos#454 | Order notification push mechanism | 2026-08-22 | Backlog | — |
| woocommerce-pos#455 | Expose Product Bundles data via REST API | 2026-08-22 | Backlog | — |
| woocommerce-pos#456 | Expose Composite Products data via REST API | 2026-08-22 | Backlog | — |
| woocommerce-pos#457 | Expose additional sort fields in REST API | 2026-08-22 | Backlog | — |
| woocommerce-pos#458 | Embedded barcode format settings and lookup | 2026-08-22 | Backlog | — |
| woocommerce-pos#459 | Expose WooCommerce Bookings via REST API | 2026-08-22 | Backlog | — |
| woocommerce-pos#460 | Expose vendor data via REST API | 2026-08-22 | Backlog | — |
| woocommerce-pos#461 | Investigate Plugin Republic Add-Ons compatibility | 2026-08-22 | Backlog | — |
| woocommerce-pos#462 | Expose WC Product Options via REST API | 2026-08-22 | Backlog | — |
| woocommerce-pos#585 | Document POS line item pricing storage for third-party sync compatibility | 2026-08-05 | Backlog | v1.10.0 |
| woocommerce-pos#793 | Analytics instrumentation: install lifecycle, activation funnel, upgrade funnel | 2026-08-23 | Backlog | — |
| woocommerce-pos#857 | Free: store.tax_ids[] admin UI + iterate tax_ids in bundled gallery templates | 2026-08-13 | Backlog | Compliance / Fiscalization |
| woocommerce-pos#1075 | POS REST routes not registered without `X-WCPOS` header → `rest_no_route` 404... | 2026-08-13 | Backlog | v1.10.0 |
| woocommerce-pos#1121 | Extension: WooCommerce Points & Rewards integration | 2026-07-09 | Backlog | — |
| woocommerce-pos-pro#287 | Support StoreApps Smart Coupons gift card/store credit balances in POS | 2026-08-23 | Backlog | — |
| woocommerce-pos-pro#290 | Integration: dedicated Gift Card plugins (Official WC Gift Cards / PW) — sell... | 2026-07-27 | Backlog | — |
| woocommerce-pos-pro#291 | Integration: WooCommerce Subscriptions — sell / sign up subscriptions at the POS | 2026-08-23 | Backlog | — |
| woocommerce-pos-pro#292 | Integration: capture customer & sync to email marketing (Mailchimp / Klaviyo)... | 2026-08-23 | Backlog | v1.11.0 |
| monorepo#40 | Settings form labels don't re-render after language change | 2026-08-14 | In Progress | v1.10.0 |
| monorepo#163 | POS stops reading SKU/barcodes when `could not requestRemote` / `bulkWrite` s... | 2026-08-13 | In Progress | v1.10.0 |
| monorepo#165 | Offline queue: email, order sync, customer sync | 2026-08-13 | In Progress | v1.10.0 |
| monorepo#323 | Security P0: remove vendored Google API key and stop tracking node_modules | 2026-08-05 | In Progress | v1.10.0 |
| woocommerce-pos#465 | Barcode scan: online fallback with auto-add | 2026-08-05 | In Progress | v1.10.0 |
| electron#341 | 1.10 promotion review follow-ups (Codex + CodeRabbit, PR #340) | 2026-08-22 | Triage | — |
| electron#387 | Storage corruption still reaches 1.10.5: changes-file parse (2GA) and recover... | 2026-09-01 | Triage | — |
| electron#406 | Startup hang and Sentry SDK error. | 2026-09-05 | Triage | — |
| electron#408 | rxdb-fs cleanup-recovery repeats forever on the logs collection (Sentry 2JH/2... | 2026-09-05 | Triage | — |
| monorepo#644 | E2E global auth blocked by dev-next wc-logs permissions | 2026-08-04 | Triage | — |
| monorepo#673 | POS Product Tile: show variation-level stock quantities | 2026-08-23 | Triage | Backlog |
| monorepo#679 | Search can't match compound words (tokenize: 'forward' misses mid-word substr... | 2026-08-04 | Triage | v1.10.0 |
| monorepo#681 | Investigate persistent pro-authenticated E2E failures on PR #680 | 2026-08-04 | Triage | — |
| monorepo#686 | live-gate: LIVE_BEARER_TOKEN support + capability-tolerant cleanup | 2026-07-16 | Triage | — |
| monorepo#688 | Wayfinder: Native E2E testing for iOS & Android (Expo) | 2026-07-18 | Triage | — |
| monorepo#695 | Grilling: Decide CI/device strategy and budget | 2026-07-16 | Triage | — |
| monorepo#698 | Grilling: Decide the native E2E auth strategy — drive real OAuth or add a tes... | 2026-07-16 | Triage | — |
| monorepo#702 | Checkout click does not enter checkout route in authenticated E2E | 2026-08-04 | Triage | — |
| monorepo#709 | Task: Assemble the native E2E handoff spec from the map's decisions | 2026-07-18 | Triage | — |
| monorepo#711 | Wayfinder: Barcode scanning overhaul — scanner connections, scan feedback, tr... | 2026-07-17 | Triage | — |
| monorepo#712 | Research: Barcode scanner connectivity — transports, platform APIs, vendor SD... | 2026-07-16 | Triage | — |
| monorepo#713 | Research: Camera-based barcode scanning for Expo SDK 56 and web | 2026-07-16 | Triage | — |
| monorepo#714 | Task: Compile top barcode-scanning support issues and real-world scanner models | 2026-07-17 | Triage | — |
| monorepo#715 | Grilling: Decide the scanner-connection architecture — input sources, transpo... | 2026-07-17 | Triage | — |
| monorepo#716 | Prototype: Scan-feedback UX — multi-stage toast vs dedicated scan-status surface | 2026-07-17 | Triage | — |
| monorepo#717 | Grilling: Decide the cashier scan-feedback UX | 2026-07-17 | Triage | — |
| monorepo#718 | Prototype: Troubleshooting and test experience for the Barcode settings page | 2026-07-17 | Triage | — |
| monorepo#720 | POS products: hide out-of-stock variations per the display setting | 2026-08-13 | Triage | Backlog |
| monorepo#722 | Task: Assemble the barcode overhaul implementation spec | 2026-07-17 | Triage | — |
| monorepo#726 | Fix persistent searching toast after failed scan add | 2026-07-20 | Triage | — |
| monorepo#727 | Fix infinite scan toast when cart add returns false | 2026-08-13 | Triage | v1.11.0 |
| monorepo#739 | Attributed-wedge registration can capture an ordinary keyboard | 2026-08-13 | Triage | v1.11.0 |
| monorepo#740 | UPC-A ↔ EAN-13 barcode equivalence in the shared resolve/lookup layer | 2026-08-13 | Triage | Backlog |
| monorepo#741 | Bundle zxing-wasm barcode decoder asset for Electron (CSP-safe camera decoding) | 2026-08-04 | Triage | — |
| monorepo#742 | Electron main-process device handlers for serial/HID scanners | 2026-08-13 | Triage | Backlog |
| monorepo#750 | Customer search with a space (full name) returns no results from the server | 2026-08-04 | Triage | v1.10.0 |
| monorepo#752 | Order search by customer name isn't robust to word order (multi-word) | 2026-09-03 | Triage | v1.11.0 |
| monorepo#753 | Product search OR-joins terms; app's local search AND-joins (relevance mismatch) | 2026-09-03 | Triage | v1.11.0 |
| monorepo#804 | change-signal: behind-head cursor replays entire server change-log (hundreds ... | 2026-08-04 | Triage | — |
| monorepo#806 | Add unit coverage for SyncStatusPersistenceBridge lifecycle | 2026-07-28 | Triage | — |
| monorepo#808 | next: draft/private products sync into and display in the POS catalog (1.9.x ... | 2026-07-28 | Triage | — |
| monorepo#809 | next: no TTFR/responsiveness perf guards — 1.9's 12-test performance suite ha... | 2026-08-04 | Triage | — |
| monorepo#810 | RULED — restore 1.9 default product browse sort (menu_order, id); keep name s... | 2026-08-04 | Triage | — |
| monorepo#811 | next: malformed variation attributes reach the UI unguarded — false 'Any' mat... | 2026-08-14 | Triage | v1.11.0 |
| monorepo#818 | sync-engine: update queued during an in-flight order create still pushes ID-l... | 2026-08-13 | Triage | v1.10.0 |
| monorepo#828 | Order line-item meta `_woocommerce_pos_data` sent as object → `display_value`... | 2026-08-04 | Triage | — |
| monorepo#830 | E2E: three pos-checkout specs rely on the test server omitting links.payment ... | 2026-07-28 | Triage | — |
| monorepo#832 | sync: dead-lettered push mutations (status 'rejected') have no recovery path | 2026-08-13 | Triage | v1.10.0 |
| monorepo#833 | Wayfinder: Logging & observability overhaul for v1.10 — action coverage, erro... | 2026-07-28 | Triage | — |
| monorepo#834 | Research: Audit the current logging/observability surface on next | 2026-07-28 | Triage | — |
| monorepo#835 | Research: Prior art — structured logging, flight recorders, and error-code sy... | 2026-07-28 | Triage | — |
| monorepo#836 | Task: Mine support history and issue trackers for diagnostic pain points | 2026-07-28 | Triage | — |
| monorepo#837 | Grilling: Set the sync diagnosability bar — what must be reconstructible from... | 2026-07-28 | Triage | — |
| monorepo#838 | Grilling: Decide the action coverage matrix and actor attribution | 2026-07-28 | Triage | — |
| monorepo#839 | Grilling: Decide the unified log data model — schema, correlation context, ca... | 2026-07-28 | Triage | — |
| monorepo#840 | Grilling: Decide the error-code taxonomy and user-facing explanations | 2026-07-28 | Triage | — |
| monorepo#841 | Grilling: Decide audit-trail framing and Pro gating | 2026-07-28 | Triage | — |
| monorepo#842 | Grilling: Decide the export/share mechanism — diagnostic bundle and privacy | 2026-07-28 | Triage | — |
| monorepo#843 | Prototype: Logs screen — the merchant-facing running dialog | 2026-07-28 | Triage | — |
| monorepo#844 | Task: Assemble the logging overhaul implementation spec | 2026-07-28 | Triage | — |
| monorepo#845 | Task: Export and mine the Discord + Gmail support archives | 2026-07-28 | Triage | — |
| monorepo#848 | Task: Sentry access + audit of current error capture | 2026-07-28 | Triage | — |
| monorepo#849 | Grilling: Sentry's role in the new model — errors-only scope, linkage, privac... | 2026-07-28 | Triage | — |
| monorepo#850 | dev-next: fresh-profile initial sync unhealthy — customers 0/5,002, products ... | 2026-08-13 | Triage | v1.10.0 |
| monorepo#862 | 1.10 BLOCKER: restore local barcode resolution (Direction A) — materialize do... | 2026-08-04 | Triage | — |
| monorepo#863 | Dropdowns don't open on iPad (iPadOS 18.7.8) — app-wide, all browsers are WebKit | 2026-08-14 | Triage | v1.10.0 |
| monorepo#864 | Void flow: fall back to status=pending when the server refuses order delete (... | 2026-08-04 | Triage | — |
| monorepo#865 | Customers: verify the four on-demand fetch paths + add an idle background tri... | 2026-08-04 | Triage | — |
| monorepo#871 | Variations should default-order by menu_order, id (1.9 contract ruling 2026-0... | 2026-08-04 | Triage | — |
| monorepo#873 | RULED regression: orders page materializes every doc on the main thread — pus... | 2026-08-04 | Triage | — |
| monorepo#874 | RULED — Clear & re-download: reset = wipe local + restore the collection's no... | 2026-08-04 | Triage | — |
| monorepo#875 | 1.10 BLOCKER: engine disposal can wedge permanently — new engine hangs foreve... | 2026-07-31 | Triage | — |
| monorepo#876 | Store switch is fire-and-forget: no navigation, session committed before hydr... | 2026-08-04 | Triage | — |
| monorepo#881 | RULED (D4): idle polling politeness — If-None-Match, jitter, idle decay to 60... | 2026-08-04 | Triage | — |
| monorepo#884 | logging: foundation hardening — six confirmed review findings (#851/#859 foll... | 2026-08-13 | Triage | v1.11.0 |
| monorepo#885 | sync-engine: born-twice requeue skips the residual-meta sanitizer (#829 follo... | 2026-08-13 | Triage | v1.11.0 |
| monorepo#886 | scheduler: menu_order tie-walk is unbounded on all-zero catalogs (#867 follow... | 2026-08-13 | Triage | v1.11.0 |
| monorepo#887 | sync-engine: late barcode-selector install never re-materializes bootstrap re... | 2026-08-13 | Triage | v1.11.0 |
| monorepo#888 | customers: unresolved-demand refetch churn + trickle cursor race (#870 follow... | 2026-08-13 | Triage | v1.11.0 |
| monorepo#894 | POS browse stalls at partial catalog on fresh profile: shows '18 de 18' in-st... | 2026-08-13 | Triage | v1.10.0 |
| monorepo#899 | Log level must reflect the terminal outcome — self-healing 401s surface as wa... | 2026-08-19 | Triage | — |
| monorepo#902 | Login within ~2s of connecting a new site loses the site↔credential link (wp_... | 2026-08-13 | Triage | v1.11.0 |
| monorepo#903 | Clear & Sync crashes: resetSubject?.next is not a function (use-collection-re... | 2026-08-04 | Triage | — |
| monorepo#904 | Product search bar loses focus after debounce commit — input remounts via key... | 2026-08-02 | Triage | — |
| monorepo#905 | POS camera scanning rework: inline expandable panel below filters, barcodeRea... | 2026-08-04 | Triage | — |
| monorepo#908 | Performance dial ignored by cold-start product fetch: browse-window seed hard... | 2026-08-04 | Triage | — |
| monorepo#909 | Products browse dead-ends after the 100-product seed: infinite scroll never f... | 2026-08-04 | Triage | — |
| monorepo#910 | Health Performance trends: render chart frames immediately with a 'not enough... | 2026-08-04 | Triage | — |
| monorepo#911 | Novu notifications bootstrap runs once per consumer (bell + panel) — init seq... | 2026-08-04 | Triage | — |
| monorepo#912 | Logs UI leaks raw engine event codes (queue.scheduler.drain, coverage.existen... | 2026-08-04 | Triage | — |
| monorepo#915 | Repeat barcode scans can race the open-order insert (unhandled RxDB CONFLICT) | 2026-08-04 | Triage | — |
| monorepo#927 | Orders infinite scroll: whole table re-suspends and flashes when the next pag... | 2026-08-04 | Triage | — |
| monorepo#929 | Duplicate online-status snackbars: one connectivity transition fires N toasts... | 2026-08-04 | Triage | — |
| monorepo#931 | Remount/flash audit: four verified patterns in the #927 bug class | 2026-08-04 | Triage | — |
| monorepo#934 | Intermittent 'Maximum update depth exceeded' warning from ZReport under full-... | 2026-08-04 | Triage | — |
| monorepo#936 | POS cart order vanishes: open order saved without POS identity meta (_pos_sto... | 2026-08-04 | Triage | — |
| monorepo#937 | next: pos-open orders must not auto-push — gate write-drain, release at check... | 2026-08-04 | Triage | — |
| monorepo#940 | sync-engine: auto drop-and-rebuild derivable coverage store when OPFS index r... | 2026-08-04 | Triage | — |
| monorepo#946 | Order sync reads dropped 1.9's dp=6 precision — pulled orders arrive rounded ... | 2026-08-13 | Triage | v1.10.0 |
| monorepo#947 | Product grid sorts with no wc/v3 equivalent (sku, stock_quantity, …) silently... | 2026-08-14 | Triage | v1.10.0 |
| monorepo#948 | Product browse scrolling hard-caps at 1,000 records (1.9 paged indefinitely) ... | 2026-08-13 | Triage | v1.10.0 |
| monorepo#949 | Carry over 1.9's performance contracts as engine tests (event-loop yield, TTF... | 2026-08-13 | Triage | v1.10.0 |
| monorepo#950 | Typed variation search creates no remote demand — variation SKU/name search i... | 2026-08-05 | Triage | v1.10.0 |
| monorepo#951 | Customers browse: cold grid + sort shows a partial, misleadingly-ordered set ... | 2026-08-13 | Triage | v1.10.0 |
| monorepo#952 | Reference lanes: fetch categories/tags/brands/coupons on demand (1.9 model), ... | 2026-08-13 | Triage | v1.10.0 |
| monorepo#954 | Ranged report fetches cannot converge past the 10,000-record runaway backstop | 2026-08-13 | Triage | v1.10.0 |
| monorepo#956 | sync-engine: ledger recovery cannot be triggered by a schedulerTaskStates rec... | 2026-08-13 | Triage | v1.10.0 |
| monorepo#957 | Orders browse scrolling hard-caps at 200 records — no filtered window ever ad... | 2026-08-13 | Triage | v1.10.0 |
| monorepo#961 | Sync scripts/opfs-targeted-recovery.mjs with electron 556434b and bump the el... | 2026-08-13 | Triage | v1.10.0 |
| monorepo#963 | Coupon replay: resume after a reference-pull timeout instead of waiting for t... | 2026-08-13 | Triage | — |
| monorepo#976 | Test gap: guest per-user coupon usage limits have no coverage | 2026-08-22 | Triage | Backlog |
| monorepo#978 | Avoid server requests for POS product searches when the catalogue is local | 2026-08-13 | Triage | — |
| monorepo#988 | Variations targeted pull throws on include shortfall — one hidden/trashed chi... | 2026-08-05 | Triage | — |
| monorepo#989 | Variations footer 'Showing X of Y' reads local count — no signal the list is ... | 2026-08-05 | Triage | — |
| monorepo#990 | Per-parent variation refresh-on-open lost — popover shows last change-signal ... | 2026-08-05 | Triage | — |
| monorepo#991 | E2E: cold-start (thin local DB) profile + variation-SKU search coverage | 2026-08-13 | Triage | — |
| monorepo#1001 | Fix variable-product-row unit tests failing on next merge refs | 2026-08-13 | Triage | — |
| monorepo#1004 | 1.9→1.10 local-data upgrade path is unwired and untested — purgeLegacyDatabas... | 2026-08-05 | Triage | v1.10.0 |
| monorepo#1012 | E2E: pos-checkout.spec.ts is flaky (process-payment-button element-not-found)... | 2026-08-13 | Triage | v1.10.0 |
| monorepo#1014 | change-signal client: pass since on /changes/tick to unlock idle 304s (envelo... | 2026-08-14 | Triage | — |
| monorepo#1034 | Coverage records accumulate one coveredQueryKeys membership per browse window... | 2026-08-13 | Triage | — |
| monorepo#1045 | OPFS targeted recovery gates on a config flag, not on actual sole ownership | 2026-08-13 | Triage | — |
| monorepo#1055 | Web multi-tab: engine scope DBs have no cross-tab coherence (breaks #1050 res... | 2026-08-13 | Triage | — |
| monorepo#1059 | Follower create+void of a never-pushed order should annihilate at drain (lead... | 2026-08-13 | Triage | — |
| monorepo#1082 | Product edit push rejection: red snackbar + auto-revert (catalog collections) | 2026-08-08 | Triage | — |
| monorepo#1083 | Products UI: gate editability on the user's real server capabilities | 2026-08-08 | Triage | — |
| monorepo#1084 | Existence reconciler: audit-only — stop bulk-downloading server-only orders/c... | 2026-08-08 | Triage | — |
| monorepo#1085 | Electron: route sync-engine + reachability HTTP through the main-process axio... | 2026-08-08 | Triage | — |
| monorepo#1086 | Electron: run the Novu client in the main process with an IPC event bridge (p... | 2026-08-08 | Triage | — |
| monorepo#1087 | Online-status: passive reachability from real traffic; fix false-offline wedge | 2026-08-08 | Triage | — |
| monorepo#1088 | E2E: products-page inline stock-qty edit (happy path + rejection path) | 2026-08-08 | Triage | — |
| monorepo#1089 | Sync/Electron cleanup batch: census dedupe, product-lane overlap, tick, stale... | 2026-08-13 | Triage | — |
| monorepo#1093 | Variations 'Clear and refresh' enqueues real server DELETEs (regression since... | 2026-08-08 | Triage | — |
| monorepo#1096 | Capability UI: coordinate cross-cutting PR #1094 review fixes | 2026-08-08 | Triage | — |
| monorepo#1098 | Root error boundary 'Try again' silently wipes ALL local data, including the ... | 2026-08-14 | Triage | — |
| monorepo#1106 | Shared-store E2E lane red since 2026-08-07 ~16:00Z: run-private probe product... | 2026-08-08 | Triage | — |
| monorepo#1129 | sync: existence audit floods the merchant server — politeness must be a core ... | 2026-08-11 | Triage | — |
| monorepo#1134 | sync politeness follow-ups from #1129: ghost residents, demand-side budget, X... | 2026-08-14 | Triage | — |
| monorepo#1136 | Wayfinder: Logs page — error codes everywhere, right-column rework, level pil... | 2026-08-11 | Triage | — |
| monorepo#1137 | Research: Inventory warn/error rows written without a registry code on next | 2026-08-11 | Triage | — |
| monorepo#1138 | Research: docs.wcpos.com stack and the publishing path for error-code pages | 2026-08-11 | Triage | — |
| monorepo#1139 | Grilling: Should every log entry carry a user-visible reference, or only prob... | 2026-08-11 | Triage | — |
| monorepo#1140 | Grilling: Error-code coverage policy and enforcement | 2026-08-11 | Triage | — |
| monorepo#1141 | Grilling: Error-code docs pages — generation, publishing, lockstep | 2026-08-11 | Triage | — |
| monorepo#1142 | Grilling: LEVEL pill filters — interaction model | 2026-08-11 | Triage | — |
| monorepo#1143 | Prototype: Ledger right-column, expand affordance and row-detail rework | 2026-08-11 | Triage | — |
| monorepo#1144 | Task: Record spec amendments and file implementation tickets | 2026-08-11 | Triage | — |
| monorepo#1147 | Approve broad Prettier 3.9 formatting fix for PR #1145 | 2026-08-14 | Triage | — |
| monorepo#1149 | Logs codes 1/6: sync conformance code column, sync code minting, level demotions | 2026-08-12 | Triage | — |
| monorepo#1150 | Logs codes 2/6: typed code on logger.error, mapExceptionToCode boundary, code... | 2026-08-12 | Triage | — |
| monorepo#1151 | Logs codes 3/6: retire legacy error-codes.ts (104-site migration + never-emit... | 2026-08-12 | Triage | — |
| monorepo#1152 | Logs codes 4/6: error-code docs page pipeline (codegen → wcpos/docs PR + CI l... | 2026-08-12 | Triage | — |
| monorepo#1153 | Logs UI 5/6: event descriptions + row-detail rework (reason/safety/safe-step/... | 2026-08-12 | Triage | — |
| monorepo#1154 | Logs UI 6/6: ledger B2 layout, level pill filters, infinite scroll, actor-nam... | 2026-08-12 | Triage | — |
| monorepo#1155 | E2E: pro-unauthenticated store discovery stalls — auth.spec site-card tests f... | 2026-08-12 | Triage | — |
| monorepo#1159 | Rebaseline audit chain issues no audit traffic in a live session — existence-... | 2026-08-13 | Triage | — |
| monorepo#1177 | perf(next): gate extra-data fetches (taxes/classes, shipping_methods, order_s... | 2026-08-12 | Triage | — |
| monorepo#1178 | perf(next): point NetInfo reachability at the wcpos/v2 ping endpoint instead ... | 2026-08-12 | Triage | — |
| monorepo#1180 | feat(next): ServerPressureMonitor ingests X-WCPOS-Pressure header for proacti... | 2026-08-13 | Triage | — |
| monorepo#1192 | Refused born-local catalogue create is auto-discarded and destroyed (cashier ... | 2026-08-13 | Triage | — |
| monorepo#1193 | sync-engine: refused born-local catalogue create is auto-discarded — resident... | 2026-08-13 | Triage | — |
| monorepo#1196 | feat(sync): consume X-Server-Load — proactive background cadence widening (#1... | 2026-08-13 | Triage | — |
| monorepo#1204 | Refused server order-delete wedges the open order: next push 409 woo_rxdb_syn... | 2026-08-14 | Triage | — |
| monorepo#1209 | web multi-tab: awaitWriteOutcome never settles in a follower tab — #866's pen... | 2026-08-14 | Triage | — |
| monorepo#1221 | Search abort/refire storm: end-reached limit churn makes useDemand abort and ... | 2026-08-14 | Triage | — |
| monorepo#1228 | Products page: column changes take 5-10s to apply to variable products and va... | 2026-08-14 | Triage | — |
| monorepo#1229 | Health DB: per-row "Check for changes now" runs an engine-wide sync — add a s... | 2026-08-14 | Triage | — |
| monorepo#1231 | Catalog write acks discard the server document — stock_status stays stale aft... | 2026-08-14 | Triage | — |
| monorepo#1251 | Auto-print races the receipt API fetch — prints the local fallback render (in... | 2026-08-17 | Triage | — |
| monorepo#1252 | Offline/fallback receipt renders lose i18n labels (empty or English) — ship r... | 2026-08-22 | Triage | — |
| monorepo#1259 | Scanner setup wizard: manual vendor RFCOMM UUID entry for Web Serial chooser | 2026-08-21 | Triage | — |
| monorepo#1277 | Enable the main-lane free E2E matrix: dev-free POS flows time out despite a h... | 2026-08-18 | Triage | — |
| monorepo#1284 | sync: server-deleted residents never pruned — tombstone apply leaks manifest ... | 2026-08-18 | Triage | — |
| monorepo#1285 | health: attention banner words pull-side stuck records as "can't upload" | 2026-08-19 | Triage | — |
| monorepo#1294 | Scan-path findings from #1292 review: wrong-cart race on order switch; unsani... | 2026-08-19 | Triage | — |
| monorepo#1296 | E2E: ephemeral per-run store — the endgame for shard scaling | 2026-08-18 | Triage | — |
| monorepo#1302 | Regression (main): fresh coupons invisible in cart search — #1282's census ba... | 2026-08-18 | Triage | — |
| monorepo#1305 | Make the electron-importer lockfile exclusion structural (pnpm-workspace), no... | 2026-09-09 | Triage | — |
| monorepo#1318 | product-trickle is unreliable in a real session: 3 of 4 live soaks saw zero c... | 2026-08-19 | Triage | — |
| monorepo#1319 | Nine sites swallow failures with no cashier-visible signal (violates the cash... | 2026-08-19 | Triage | — |
| monorepo#1321 | Audit: which collections share the #1302 maintenance-vs-demand suppression class | 2026-08-21 | Triage | — |
| monorepo#1323 | Type HydrationContext's document fields (censused: ~270 consumer errors acros... | 2026-08-21 | Triage | — |
| monorepo#1334 | Free lane E2E runs ~2x slower than pro — find out why | 2026-08-19 | Triage | — |
| monorepo#1338 | health: a pull escalation that stops recurring never clears from the attentio... | 2026-08-21 | Triage | — |
| monorepo#1341 | Store discovery should use a light endpoint, not the raw WordPress REST index... | 2026-08-19 | Triage | — |
| monorepo#1345 | Audit: two bug mechanisms behind the 2026-08-19 incidents — silent loss acros... | 2026-08-19 | Triage | — |
| monorepo#1347 | Reference collections (categories/tags/brands/coupons) should trickle in sort... | 2026-08-21 | Triage | — |
| monorepo#1348 | Gated maintenance ticks are still silent — automaticTickGate returns before t... | 2026-08-19 | Triage | — |
| monorepo#1350 | Ruling needed: should re-sorting the customers grid withdraw customerSearchCa... | 2026-08-21 | Triage | — |
| monorepo#1351 | Product decision: should the catalogue trickle have a ceiling (count / storag... | 2026-08-21 | Triage | — |
| monorepo#1352 | Lifecycle-gated maintenance ticks are still completely silent (the one path #... | 2026-08-19 | Triage | — |
| monorepo#1368 | sync-engine: coverage-compaction lane crashes every tick — coverage records s... | 2026-08-19 | Triage | — |
| monorepo#1369 | components: Badge digit inherits the parent Button's hover colour — blue text... | 2026-08-19 | Triage | — |
| monorepo#1372 | Product decision: flip the POS grid default sort to name asc — reverses #810,... | 2026-08-19 | Triage | — |
| monorepo#1385 | ADR 0028 execution: staging plan for retiring the document-proxy (engine-nati... | 2026-08-21 | Triage | — |
| monorepo#1388 | E2E red on main: server-created-visibility spec times out waiting for grid ar... | 2026-08-20 | Triage | — |
| monorepo#1400 | census:products has two writers with divergent server populations (latent spl... | 2026-08-20 | Triage | — |
| monorepo#1409 | Products screen scan handler stays subscribed while on the POS screen (scans ... | 2026-08-21 | Triage | — |
| monorepo#1411 | Electron: migrate the main-process HTTP bridge from Node axios to net.fetch (... | 2026-08-21 | Triage | — |
| monorepo#1412 | use-http-client: no default request timeout — UI requests can hang forever on... | 2026-08-21 | Triage | — |
| monorepo#1413 | Refund form: x-wp-totalpages header dependence silently truncates refund hist... | 2026-08-21 | Triage | — |
| monorepo#1414 | sync-engine: make the fetcher port required — the globalThis.fetch default is... | 2026-08-21 | Triage | — |
| monorepo#1415 | Decide mobile TLS/cleartext posture: Android user-added CAs, iOS ATS, plain-H... | 2026-08-21 | Triage | — |
| monorepo#1416 | HTTP layer hygiene: redundant http.web.ts, dead use-http-error-handler, stale... | 2026-08-21 | Triage | — |
| monorepo#1425 | Drawer nav items unreachable on very short viewports (drawer does not scroll) | 2026-08-21 | Triage | — |
| monorepo#1434 | Electron: updater and Novu main-process HTTP still ride the Node stack (same ... | 2026-08-21 | Triage | — |
| monorepo#1438 | Decide scan ownership scope: should the whole POS section handle scans (cart ... | 2026-08-21 | Triage | — |
| monorepo#1440 | Orders page: route barcode scans into the search field | 2026-08-21 | Triage | — |
| monorepo#1445 | Wedge scans on web are lost while an input or payment iframe owns focus | 2026-08-21 | Triage | — |
| monorepo#1449 | Print an order barcode on receipts (unlocks scan-to-find on the Orders screen) | 2026-08-21 | Triage | — |
| monorepo#1461 | iOS BLE scanner source (Netum-class vendor GATT) — first ScanHub registerSour... | 2026-08-22 | Triage | — |
| monorepo#1467 | Ruling: which language does a receipt print in? (POS UI language vs store/tem... | 2026-08-22 | Triage | — |
| monorepo#1472 | order-math: finish the PR 2 cutover — settleCart, one cart writer, translated... | 2026-08-23 | Triage | — |
| monorepo#1478 | packages/printer: clear the 119 eslint findings and wire the lint task | 2026-08-22 | Triage | — |
| monorepo#1480 | DataTable takes renderCell as a function, so cell twins drift — the variation... | 2026-08-22 | Triage | — |
| monorepo#1482 | Select speaks Option objects but every caller holds a scalar — the relabel ad... | 2026-08-23 | Triage | — |
| monorepo#1483 | ui-settings forms: seven files to express seven string literals, and two of t... | 2026-08-22 | Triage | — |
| monorepo#1497 | Settings → Tax: selecting Standard rate for shipping tax class silently fails... | 2026-08-22 | Triage | — |
| monorepo#1507 | pos: stop pushing the order aggregate — WooCommerce discards it and its ack m... | 2026-08-23 | Triage | — |
| monorepo#1546 | health: the open cart's held edit is counted as a "change waiting to send" — ... | 2026-08-24 | Triage | — |
| monorepo#1547 | health: the uptime strip counts absorbed 401s and aborts as failures — an amb... | 2026-08-24 | Triage | — |
| monorepo#1553 | Search-select comboboxes stop at 50 rows — the pickers lost their infinite sc... | 2026-08-25 | Triage | — |
| monorepo#1559 | Engine: two ways to resolve the active scope, and the fallback reads the boot... | 2026-08-25 | Triage | — |
| monorepo#1560 | Order-math warnings reach core intact, then every sink discards them — includ... | 2026-08-25 | Triage | — |
| monorepo#1561 | Six fault counters answer three unnamed questions — two disagree correctly, a... | 2026-08-25 | Triage | — |
| monorepo#1577 | Variation thumbnails are blank in list view on 1.10.0 stores | 2026-08-25 | Triage | — |
| monorepo#1582 | Remove the electron submodule from the monorepo | 2026-09-09 | Triage | — |
| monorepo#1583 | Config-fingerprint repair is gated on barcode_fields, so WC < 9.2 stores neve... | 2026-08-25 | Triage | — |
| monorepo#1595 | OPFS/storage: one throwing write kills a collection for the session — leaked ... | 2026-08-27 | Triage | — |
| monorepo#1599 | Send a sync protocol header and handle the server's update-required response | 2026-08-27 | Triage | — |
| monorepo#1600 | Idle trickle for variations — complete replica | 2026-08-28 | Triage | — |
| monorepo#1601 | Order 409 auto-rebaseline overwrites server truth — conflict-recovery review | 2026-08-28 | Triage | — |
| monorepo#1603 | Header transport for X-WCPOS-Protocol/Client with per-store capability gating... | 2026-08-27 | Triage | — |
| monorepo#1605 | OPFS/storage: crash between index persist and changelog truncation double-rep... | 2026-08-30 | Triage | — |
| monorepo#1638 | Wayfinder: Change-aware CI — route every change to the test tiers it can brea... | 2026-08-28 | Triage | — |
| monorepo#1639 | Research: How change-aware CI is done in RN/Expo monorepos — affected graphs,... | 2026-08-28 | Triage | — |
| monorepo#1640 | Research: Native Maestro checks on pull requests — cost, EAS build reuse, and... | 2026-08-28 | Triage | — |
| monorepo#1641 | Research: Audit our test tiers — coverage, cost, dependency graph, and the la... | 2026-08-28 | Triage | — |
| monorepo#1642 | Grilling: Decide the change-class → test-tier routing matrix (typecheck inclu... | 2026-08-28 | Triage | — |
| monorepo#1643 | Prototype: Dry-run the routing matrix against the last 30 merged PRs | 2026-08-28 | Triage | — |
| monorepo#1644 | Grilling: Decide what gates a PR vs runs on merge, nightly, or pre-release — ... | 2026-08-28 | Triage | — |
| monorepo#1645 | Grilling: Decide the routing mechanism and its fail-safes — scope script, tur... | 2026-08-28 | Triage | — |
| monorepo#1646 | Grilling: Decide budgets, concurrency and retry policy per tier | 2026-08-28 | Triage | — |
| monorepo#1647 | Task: Assemble the change-aware CI handoff spec | 2026-08-28 | Triage | — |
| monorepo#1669 | One transient ping failure shows the cashier "Website is unreachable" | 2026-08-30 | Triage | — |
| monorepo#1671 | POS product grid crashes to the error boundary while typing a search (FlashList) | 2026-08-30 | Triage | — |
| monorepo#1672 | Native: every cancelled fetch is misreported as "store unreachable" (error.na... | 2026-09-01 | Triage | — |
| monorepo#1679 | Native E2E types like a barcode scanner (not a product bug) | 2026-08-29 | Triage | — |
| monorepo#1681 | Product search: terms shorter than 3 chars (e.g. "K2") never reach the server... | 2026-08-29 | Triage | — |
| monorepo#1691 | iOS: drawer re-opens by itself after navigating to Orders on a slow device (f... | 2026-08-30 | Triage | — |
| monorepo#1693 | Cart: repeated presses of the remove button leave the row pulsing red and nev... | 2026-08-30 | Triage | — |
| monorepo#1732 | Search must match what the cashier types: accent- and Unicode-normalization-i... | 2026-08-31 | Triage | — |
| monorepo#1733 | Search must answer from the moment the till opens — never a silent false 'no ... | 2026-08-31 | Triage | — |
| monorepo#1785 | feat(pos): setting to put the products panel on the left or right of the cart | 2026-09-03 | Triage | v1.11.0 |
| monorepo#1813 | ci(e2e): next-lane E2E contends on the single dev-next store — overlapping PR... | 2026-09-03 | Triage | — |
| monorepo#1872 | sync: 401 storm — lane ticks log every tick, token-refresh 401 loops one inst... | 2026-09-05 | Triage | — |
| monorepo#1873 | web storage: bulkWrite fails every tick on OPFS, error dropped from the log (... | 2026-09-05 | Triage | — |
| monorepo#1874 | checkout: mutation timeouts hide a thrown push TypeError; woocommerce_rest_in... | 2026-09-05 | Triage | — |
| monorepo#1875 | checkout: 'server totals differ' is mostly unrounded line tax, with three rea... | 2026-09-05 | Triage | — |
| monorepo#1876 | sentry: *999 fingerprints merge unrelated errors; sleeping/offline/403 condit... | 2026-09-05 | Triage | — |
| roadmap#48 | Prevent overselling — wayfinder map | 2026-07-17 | Triage | — |
| roadmap#49 | Define the Prevent-overselling validation semantics | 2026-07-17 | Triage | — |
| roadmap#50 | Design the stock-error contract between plugin and app | 2026-07-17 | Triage | — |
| roadmap#51 | Decide out-of-stock variation hiding in the products panel | 2026-07-17 | Triage | — |
| roadmap#52 | Prototype stock display in the variations popover | 2026-07-17 | Triage | — |
| roadmap#53 | Decide how the Prevent-overselling setting reaches the app | 2026-07-17 | Triage | — |
| roadmap#54 | Land server-side stock validation on next | 2026-07-17 | Triage | — |
| roadmap#55 | Land app-side cart stock blocking on next | 2026-07-17 | Triage | — |
| roadmap#56 | Land variation stock in the popover on next | 2026-07-17 | Triage | — |
| roadmap#57 | Land out-of-stock variation hiding on next | 2026-07-17 | Triage | — |
| roadmap#58 | Decide the checkout-rejection cashier UX | 2026-07-17 | Triage | — |
| roadmap#59 | Land the generic server-settings merge on next | 2026-07-17 | Triage | — |
| roadmap#98 | Research: prior-art POS payment models (Medusa, Square, Shopify POS, Odoo, Ad... | 2026-08-28 | Triage | — |
| roadmap#99 | Research: Stripe Terminal on React Native/Expo — what the server must own for... | 2026-08-28 | Triage | — |
| roadmap#100 | Research: WooCommerce payment constraints and how gift-card / store-credit pl... | 2026-08-28 | Triage | — |
| roadmap#101 | Research: survey the wcpos terminal extensions' adapter usage — the compatibi... | 2026-08-28 | Triage | — |
| roadmap#102 | Decide the payments language: tender, capture mode, payment, and what 'gatewa... | 2026-08-28 | Triage | — |
| roadmap#103 | Decide the payment ledger: storage, the Woo order's payment_method under spli... | 2026-09-02 | Triage | — |
| roadmap#104 | Decide the payment-method descriptor: capture-mode taxonomy, capability flags... | 2026-09-02 | Triage | — |
| roadmap#105 | Decide offline payment recording: which tenders complete offline, idempotency... | 2026-09-02 | Triage | — |
| roadmap#106 | Decide tips and surcharges in the money model | 2026-09-02 | Triage | — |
| roadmap#107 | Decide split payments: the cashier rules (running balance, change, refunds ac... | 2026-09-02 | Triage | — |
| roadmap#108 | Decide extension compatibility: adapter v2 + shim vs hard cut in the 1.11 bat... | 2026-09-02 | Triage | — |
| roadmap#109 | Decide the payment-method filter's option list from the inventory (closes the... | 2026-09-02 | Triage | — |
| roadmap#110 | Prototype: six payment scenarios as fixtures against the descriptor + ledger ... | 2026-09-02 | Triage | — |
| roadmap#111 | Prototype: the checkout tender flow with split payments and device readers | 2026-09-02 | Triage | — |
| roadmap#112 | Task: re-sync next from main in both repos so 1.11 has a live lane | 2026-08-28 | Triage | — |
| roadmap#114 | Research: card-present SDK landscape for the app driver harness (Stripe, Squa... | 2026-08-28 | Triage | — |
| roadmap#115 | Decide the app-side driver harness: driver interface, descriptor-switched ena... | 2026-09-02 | Triage | — |
| roadmap#116 | Research: how WooCommerce plugins model one purchase paid by several payments... | 2026-08-28 | Triage | — |
| roadmap#121 | Decide the extensibility language: extension, mini-app, display page, broadca... | 2026-09-01 | Triage | — |
| roadmap#122 | Research: customer-display transport and pairing landscape | 2026-09-01 | Triage | — |
| roadmap#123 | Research: mini-app delivery and webview bridge landscape | 2026-09-01 | Triage | — |
| roadmap#124 | Research: prior-art POS and app extension platforms | 2026-09-01 | Triage | — |
| roadmap#125 | Decide the customer display v1: surfaces, transport, and the broadcast contract | 2026-09-02 | Triage | — |
| roadmap#126 | Decide the printer-wizard mini-app v1: delivery, bridge API, and capabilities | 2026-09-02 | Triage | — |
| roadmap#127 | Write the broadcast contract v1 spec: envelope, events, order-snapshot payloa... | 2026-09-02 | Triage | — |
| roadmap#128 | Land the customer display Pro plugin half on next: signaling mailbox, pairing... | 2026-09-03 | Triage | — |
| roadmap#130 | Land the display host page and template engine on next: state sections, behav... | 2026-09-03 | Triage | — |
| roadmap#131 | Prototype the built-in customer display templates | 2026-09-02 | Triage | — |
| roadmap#132 | Write the bridge contract v1 spec: envelope, handshake, RPC, capability schem... | 2026-09-02 | Triage | — |
| roadmap#133 | Land the mini-app host, bridge, printer capabilities and catalog in the app o... | 2026-09-02 | Triage | — |
| roadmap#138 | Research: keep the custom POS order statuses (pos-open / pos-partial) or move... | 2026-09-02 | Triage | — |
| roadmap#139 | Decide the slot primitive v1: two first-party consumers on next for 1.11.0 | 2026-09-02 | Triage | v1.11.0 |
| roadmap#140 | Research: extensible React Native app architectures — React team, Software Ma... | 2026-09-02 | Triage | v1.11.0 |
| roadmap#141 | Land the Free plugin half of the payments contract on next: descriptor route,... | 2026-09-03 | Triage | — |
| roadmap#142 | Land the app-side payments data layer on next: descriptors, ledger on the ord... | 2026-09-03 | Triage | — |
| roadmap#143 | Land the new checkout modal on next: two-pane tender flow, split, legacy tab,... | 2026-09-03 | Triage | — |
| roadmap#152 | Land Free's route-family integrity on next: per-order lock, capture verificat... | 2026-09-08 | Triage | — |
| roadmap#153 | Land Pro's shared server-mode base on next: Abstract_Server_Handler, reader c... | 2026-09-08 | Triage | — |
| roadmap#154 | Land the server capture-mode flow in the checkout modal on next: reader picke... | 2026-09-08 | Triage | — |
| roadmap#156 | Decide the display template system v1: merchant authoring path, phone-first b... | 2026-09-05 | Triage | — |
| roadmap#159 | Prototype the three built-in display templates: small-screen, large-screen, r... | 2026-09-05 | Triage | — |
| roadmap#165 | Land the checkout column swap on next: tender pane replaces the products colu... | 2026-09-07 | Triage | — |
| roadmap#167 | Decide the display template gallery: screen facet, theme categories, first se... | 2026-09-08 | Triage | — |
| roadmap#169 | Resume or capture an authorized terminal leg whose order has already complete... | 2026-09-09 | Triage | — |
| roadmap#172 | Free: per-gateway reader settings UI (default_reader, allowed_readers, lock_t... | 2026-09-09 | Triage | — |
| roadmap#173 | Land Stripe Terminal smart readers as the second server-mode provider on next... | 2026-09-09 | Triage | — |
| woocommerce-pos#1135 | Critical: Pro User Reports System Non-Functional - Requires Immediate Attention | 2026-08-04 | Triage | — |
| woocommerce-pos#1158 | Settings Section Registry: post-refactor cleanup (legacy delegates, transitio... | 2026-08-22 | Triage | — |
| woocommerce-pos#1188 | Bootstrap landing-variant flag server-side & fix identify ordering (A/B test ... | 2026-08-04 | Triage | — |
| woocommerce-pos#1242 | Fix PHPStan return type for sync dispatch_write | 2026-08-05 | Triage | — |
| woocommerce-pos#1309 | Audit: carry the v1 POS order-write monkey patches to the v2 write surface | 2026-07-30 | Triage | — |
| woocommerce-pos#1313 | Merge gate: indeterminate merge state (UNKNOWN) passes the conflict check | 2026-08-06 | Triage | — |
| woocommerce-pos#1321 | Change_Log: customer updates are double-logged (two rows per change) | 2026-08-04 | Triage | — |
| woocommerce-pos#1322 | Change_Log: unbounded growth — needs retention/compaction | 2026-08-13 | Triage | v1.10.0 |
| woocommerce-pos#1341 | Decide the fate of the fixed-layout output adapter family for Star printers | 2026-08-14 | Triage | v1.10.0 |
| woocommerce-pos#1351 | Cloud print: order-based Star rendering, real mediaTypes negotiation, PNG uni... | 2026-08-23 | Triage | — |
| woocommerce-pos#1353 | PHPUnit default suite excludes all *_Test.php files — 26 files (entire cloud-... | 2026-07-26 | Triage | — |
| woocommerce-pos#1362 | Print queue: a retried failure stays in "Needs attention" and can be retried ... | 2026-08-14 | Triage | v1.10.0 |
| woocommerce-pos#1364 | Typed meta: server emits object display_value for structured meta values, bre... | 2026-08-04 | Triage | — |
| woocommerce-pos#1368 | Cashier cannot delete orders via v2 write surface (void-by-delete 403s) — nee... | 2026-07-29 | Triage | — |
| woocommerce-pos#1369 | Cloud-print follow-ups from CodeRabbit's re-review of sync PR #1358 (6 minor ... | 2026-08-23 | Triage | — |
| woocommerce-pos#1370 | v2 digests/integrity: honor status=publish so the existence surface matches t... | 2026-07-28 | Triage | — |
| woocommerce-pos#1371 | v2 order delete does not restore stock (v1 restored it, settings-gated) — inv... | 2026-08-05 | Triage | — |
| woocommerce-pos#1372 | v2 read-surface parity: probe + pin batch from the v1-surface audit (order se... | 2026-07-29 | Triage | — |
| woocommerce-pos#1373 | integrity: an empty stored-digest table should self-heal, not emit endless mi... | 2026-07-28 | Triage | — |
| woocommerce-pos#1379 | RULED — widen the POS customer space to ALL users (1.9 parity): Change_Log, d... | 2026-08-04 | Triage | — |
| woocommerce-pos#1380 | CORS: Access-Control-Allow-Headers omits Idempotency-Key / If-Match, breaking... | 2026-08-04 | Triage | — |
| woocommerce-pos#1385 | 1.10 BLOCKER: local barcode resolution regressed — v1's barcode field was rem... | 2026-08-04 | Triage | — |
| woocommerce-pos#1387 | 1.10 BLOCKER: v2 order documents lack payment + receipt links — v1's _links i... | 2026-08-04 | Triage | — |
| woocommerce-pos#1388 | v2 catalog proxy serves full-resolution product images — port v1's medium-siz... | 2026-08-04 | Triage | — |
| woocommerce-pos#1389 | PROBE then fix: decimal quantities likely rejected by the v2 write surface — ... | 2026-08-04 | Triage | — |
| woocommerce-pos#1396 | Receipt timestamps ignore WordPress `time_format` and can force 12-hour AM/PM | 2026-07-30 | Triage | — |
| woocommerce-pos#1399 | Unify receipt time rendering between opening hours and order timestamps | 2026-08-22 | Triage | — |
| woocommerce-pos#1402 | test(v2): route-dispatch pins for Stock_Validator + Order_Taxes matrix on /wc... | 2026-08-05 | Triage | — |
| woocommerce-pos#1403 | audit(v2): unaudited v1 order-write handlers + customer tax_ids write side (p... | 2026-08-05 | Triage | — |
| woocommerce-pos#1405 | RULED (D4): combined change-signal tick endpoint — fingerprint + sequence hea... | 2026-08-04 | Triage | — |
| woocommerce-pos#1406 | Graduate the /wcpos/v2/changes surface out of lab-candidate vocabulary before... | 2026-08-13 | Triage | v1.10.0 |
| woocommerce-pos#1407 | Response_Telemetry: is_change_candidate_route should be a prefix check on cha... | 2026-08-13 | Triage | v1.10.0 |
| woocommerce-pos#1413 | Activator: schema-upgrade retry skips tombstone compensation after a failed h... | 2026-08-05 | Triage | — |
| woocommerce-pos#1418 | Commit a lockfile for the php-scoper build so vendor_prefixed rebuilds are re... | 2026-08-22 | Triage | — |
| woocommerce-pos#1423 | Cloud Print: allow auto-print rules to print multiple copies | 2026-08-13 | Triage | — |
| woocommerce-pos#1434 | Cash gateway renders order money in the site default currency | 2026-08-14 | Triage | v1.10.0 |
| woocommerce-pos#1437 | Receipt_Date_Formatter leaves a stray space before punctuation when the day-p... | 2026-08-14 | Triage | v1.10.0 |
| woocommerce-pos#1442 | Hidden (online_only) variations leak through /wcpos/v2/products SKU-ish params | 2026-08-05 | Triage | — |
| woocommerce-pos#1456 | v2 push order-totals parity: ranked gaps vs the v1 calculation machinery (1.1... | 2026-08-07 | Triage | v1.10.0 |
| woocommerce-pos#1513 | Change-log purge follow-ups from PR #1462 review (atomic watermark, compactio... | 2026-08-13 | Triage | — |
| woocommerce-pos#1514 | v2 catalog capability enforcement follow-ups from PR #1501 review (Access-set... | 2026-08-14 | Triage | v1.10.0 |
| woocommerce-pos#1515 | Cloud_Print_Trigger_Service reads raw printer provider without Provider::norm... | 2026-08-13 | Triage | — |
| woocommerce-pos#1516 | composer advisory ignore uses a key Composer does not consult (config.policy.... | 2026-08-13 | Triage | — |
| woocommerce-pos#1528 | Research: wp.org guidelines for installing Pro from the free plugin | 2026-08-07 | Triage | — |
| woocommerce-pos#1529 | Research: WP remote-install mechanics and host failure modes | 2026-08-07 | Triage | — |
| woocommerce-pos#1530 | Decide: Connect & Install UX and activation semantics | 2026-08-11 | Triage | — |
| woocommerce-pos#1534 | Research: license-enforcement hardening options for Pro | 2026-08-07 | Triage | — |
| woocommerce-pos#1536 | Default cashier caps: create+edit for products, coupons, customers (no delete... | 2026-08-08 | Triage | — |
| woocommerce-pos#1537 | changes/tick: return a slim head instead of a full 100-row change page | 2026-08-08 | Triage | — |
| woocommerce-pos#1548 | v2-lane acks serve tax_lines unrounded (violates the display-rounded money co... | 2026-08-11 | Triage | — |
| woocommerce-pos#1550 | v2 order store reassignment: no Pro authorization check, and it lands AFTER t... | 2026-08-10 | Triage | — |
| woocommerce-pos#1551 | v2 create drops the 'Any …' variation attribute selection (v1 display-field f... | 2026-08-10 | Triage | — |
| woocommerce-pos#1554 | thermal-utils tests don't run in CI; add generate-barcode-svg coverage | 2026-08-10 | Triage | — |
| woocommerce-pos#1555 | Star emitter falls back to Code 128 for Codabar (nw7 vs codabar node type) | 2026-08-10 | Triage | — |
| woocommerce-pos#1560 | Two change logs: fold `sync_index` (orders) into `change_log`, or justify kee... | 2026-08-22 | Triage | v1.10.0 |
| woocommerce-pos#1561 | Dev servers keep stale role capabilities: Activator re-syncs only on a versio... | 2026-08-14 | Triage | v1.10.0 |
| woocommerce-pos#1564 | Research: where license activations actually live (am-software-api vs Keygen) | 2026-08-11 | Triage | — |
| woocommerce-pos#1568 | perf(next): order-item UUID guard takes GET_LOCK before checking — 2 lock rou... | 2026-08-12 | Triage | — |
| woocommerce-pos#1569 | perf(next): products endpoint runs ~2,100 queries per page — per-product N+1 ... | 2026-08-13 | Triage | — |
| woocommerce-pos#1570 | feat(next): lightweight wcpos/v2 ping/status endpoint — stop reachability pro... | 2026-08-12 | Triage | — |
| woocommerce-pos#1571 | feat(next): emit X-WCPOS-Pressure header on all wcpos/v2 REST responses | 2026-08-13 | Triage | — |
| woocommerce-pos#1573 | perf(next): integrity scan recomputes full-table live digests on every reques... | 2026-08-14 | Triage | v1.10.0 |
| woocommerce-pos#1580 | perf(next): wc/v3 products proxy computes related_ids per product — ~250 wast... | 2026-08-13 | Triage | — |
| woocommerce-pos#1582 | ping early-exit: WP debug notice (is_404 doing_it_wrong) can leak after the J... | 2026-08-13 | Triage | — |
| woocommerce-pos#1605 | 1.10 promotion review follow-ups (Codex, PR #1603) | 2026-08-22 | Triage | — |
| woocommerce-pos#1710 | v2 variations are serialized through the PRODUCTS controller — the payload ch... | 2026-08-25 | Triage | — |
| woocommerce-pos#1711 | Changes_Controller applies no POS-visibility filter — the repair tiers count ... | 2026-08-25 | Triage | — |
| woocommerce-pos#1712 | v2 orders and brands have no payload field-set pin — the next silent shape ch... | 2026-08-25 | Triage | — |
| woocommerce-pos#1717 | v2 catalog-proxy payload pins assert a shape no deployed client receives (mis... | 2026-09-08 | Triage | — |
| woocommerce-pos#1725 | Order save takes ~7s: `ORDER BY … LIMIT 2` on uuid collision checks forces a ... | 2026-08-26 | Triage | — |
| woocommerce-pos#1731 | v2 Sync Engine Trust Audit — wayfinder map | 2026-08-26 | Triage | — |
| woocommerce-pos#1732 | Survey: the v2 sync engine at 10,000 feet | 2026-08-26 | Triage | — |
| woocommerce-pos#1733 | Archaeology: why do orders use a content-hash revision? | 2026-08-26 | Triage | — |
| woocommerce-pos#1734 | Archaeology: the variations divergence — envelope, controller, lanes | 2026-08-26 | Triage | — |
| woocommerce-pos#1735 | Audit: WooCommerce hook parity of the v2 API | 2026-08-26 | Triage | — |
| woocommerce-pos#1736 | Verdict: variations as a first-class record | 2026-08-26 | Triage | — |
| woocommerce-pos#1737 | Verdict: the order revision paradigm | 2026-08-26 | Triage | — |
| woocommerce-pos#1738 | Verdict: the hook-parity contract | 2026-08-26 | Triage | — |
| woocommerce-pos#1739 | The uniformity doctrine and trust verdict | 2026-08-26 | Triage | — |
| woocommerce-pos#1745 | Delete order revision residue: recipe version list, legacy-grace comparer, gr... | 2026-08-26 | Triage | — |
| woocommerce-pos#1746 | Order revision: compute at pull time with schema-scoped recipe (verdict #1737) | 2026-09-08 | Triage | — |
| woocommerce-pos#1747 | Rescue stranded lab ADRs 0028-0030 into docs/adr/ | 2026-08-26 | Triage | — |
| woocommerce-pos#1748 | Verdict: the dedicated order pull lane | 2026-08-26 | Triage | — |
| woocommerce-pos#1750 | Verdict: the remediation shipping strategy | 2026-08-26 | Triage | — |
| woocommerce-pos#1751 | Variations hydration lane: run the real collection query, fix stale docblocks | 2026-08-26 | Triage | — |
| woocommerce-pos#1753 | Hook-parity contract implementation (1.10.x) | 2026-08-27 | Triage | — |
| woocommerce-pos#1756 | Integrity coverage implementation (1.10.x): universal fingerprints, full-matr... | 2026-08-27 | Triage | — |
| woocommerce-pos#1757 | 1.11.0 boundary: retire the order-lane revision residue (stored-wins branch, ... | 2026-09-06 | Triage | — |
| woocommerce-pos#1763 | CORS: reflect announced preflight headers on owned requests — freeze the stat... | 2026-08-27 | Triage | — |
| woocommerce-pos#1776 | Auth: _woocommerce_pos_refresh_tokens user meta grows without bound — a 9 MB ... | 2026-08-30 | Triage | — |
| woocommerce-pos#1777 | wcpos/v2 product search matches product descriptions (1.10 regression from v1... | 2026-08-29 | Triage | — |
| woocommerce-pos#1779 | wcpos/v2 products rejects orderby=sku\|barcode\|stock_quantity\|stock_status ... | 2026-08-30 | Triage | — |
| woocommerce-pos#1805 | perf: three plugin queries scale with merchant data (uuid collision scan per ... | 2026-08-30 | Triage | — |
| woocommerce-pos#1811 | Consent-gated Sentry error reporting for the PHP plugin (release wcpos-php@x.... | 2026-09-01 | Triage | — |
| woocommerce-pos#1862 | POS Only products should force WooCommerce catalog visibility to Hidden | 2026-09-08 | Triage | v1.11.0 |
| woocommerce-pos#1863 | JWT Authentication for WP-API still blocks POS requests: its error surfaces v... | 2026-09-04 | Triage | — |
| woocommerce-pos#1868 | 1.11.0 boundary: protocol gate on the wcpos/v2 sync surface (426 wcpos_update... | 2026-09-05 | Triage | v1.11.0 |
| woocommerce-pos#1869 | 1.11.0 boundary: variations bare envelope + content-hash revision; bare /reso... | 2026-09-05 | Triage | v1.11.0 |
| woocommerce-pos#1870 | 1.11.0 boundary: schema-scoped order revision recipe + /orders/pull checkpoin... | 2026-09-06 | Triage | v1.11.0 |
| woocommerce-pos#1880 | sync digest upsert fails with MariaDB 1020 'Record has changed since last rea... | 2026-09-05 | Triage | — |
| woocommerce-pos#1896 | WooCommerce Tax (automated taxes) restores stale tax lines on POS order updat... | 2026-09-07 | Triage | — |
| woocommerce-pos-pro#326 | Align Pro settings onto the free Settings Section Registry (register License_... | 2026-08-23 | Triage | — |
| woocommerce-pos-pro#356 | License save handler returns 500 when settings are unchanged | 2026-07-16 | Triage | — |
| woocommerce-pos-pro#360 | License instance auto-mint fatals at plugin load when the store is empty (wp_... | 2026-07-16 | Triage | — |
| woocommerce-pos-pro#380 | Port free's merge-gate conflict fail-closed check to pro | 2026-08-06 | Triage | — |
| woocommerce-pos-pro#393 | deploy-dev: port php-container restart + runtime marker verification from the... | 2026-07-28 | Triage | — |
| woocommerce-pos-pro#399 | Pro bootstrap diverges from free's woocommerce-pos.php — audit and converge | 2026-07-31 | Triage | — |
| woocommerce-pos-pro#425 | Store-scoped product pricing/taxes are absent from the v2 lane — till price e... | 2026-08-10 | Triage | — |
| woocommerce-pos-pro#433 | Pro bootstrap never runs the free plugin's ping early-exit — and dev-next run... | 2026-08-14 | Triage | — |
| woocommerce-pos-pro#442 | 1.10 promotion review follow-ups (Codex, PR #441) | 2026-08-22 | Triage | — |
| woocommerce-pos-pro#482 | Replace customer fixture L_CA lambda flagged by Ruff E731 | 2026-08-27 | Triage | — |
| woocommerce-pos-pro#483 | Manual Release publishes the release before the zip is uploaded — Pro install... | 2026-08-28 | Triage | — |
| woocommerce-pos-pro#487 | store-edit bundle: depend on free's wcpos-api-fetch-method-param shim so stor... | 2026-08-29 | Triage | — |
| woocommerce-pos-pro#488 | Legacy store editor: country→state dropdown calls an unregistered wc_pos_pro_... | 2026-08-29 | Triage | — |
| monorepo#42 | Block adding out-of-stock items to cart | 2026-08-13 | Up Next | v1.10.0 |
| roadmap#1 | Prevent overselling at POS | 2026-09-06 | Up Next | v1.10.0 |
| woocommerce-pos#443 | Server-side stock validation on order creation | 2026-08-13 | Up Next | v1.10.0 |

</details>
