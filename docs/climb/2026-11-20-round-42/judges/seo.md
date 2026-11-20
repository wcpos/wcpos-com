# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: a free, open-source point of sale for WooCommerce. It turns a tablet, phone or computer into a register that sells from the store's own catalog, stock and prices, even offline.
Why version 2: the red "New in 2.0" line above the kicker says that opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /downloads, all viewports, step 3 of "Three steps to your first sale". Still live; raised in round 41 and not taken.
- Element: the step body says "A licensed plugin that adds more registers and stores, terminal payments, refunds and stock control on the same foundation." The card directly below it, "Unlock more registers", says "More registers & stores, terminal payments, refunds, stock & pricing, order management, full reports and priority Discord support." (`downloads.page.steps.pro.body` and `.cardBody` in `messages/*.json`).
- Problem: the same feature list appears twice, about 40 px apart, and its first four items are identical. The card heading repeats the first item a third time.
- Why it costs: step 3 is the only Pro upsell a visitor sees on /downloads before leaving to install. Copy that repeats itself reads as filler, so the visitor skims past the items that are new to them (order management, full reports, priority support), and those are the reason to click "View Pro plans".
- Fix: make the step body one line on why someone would upgrade, for example "When one register isn't enough, Pro adds to the same plugin.". Keep the full list in `cardBody` only, in every locale.
- Scope: ok (copy only; no new claims, every item is already on /pro).

## Worst defect — UI
- Page/viewport: /de and /nl home, phone (390×844), H1 on the first screen.
- Element: "Dein WooCommerce-Shop an der Ladentheke." renders as "Dein WooCommerce- / Shop an / der Ladentheke." and "Je WooCommerce-winkel, aan de toonbank." renders as "Je WooCommerce- / winkel, aan / de toonbank." (en phone is fine: "Your WooCommerce / store, at the counter.").
- Problem: `text-balance` in `src/components/home/scroll-story/acts/story-copy-blocks.tsx:99` (#877) evens out the line lengths. On a phone that splits the prepositional phrase, so "an" and "aan" dangle at a line end and the article starts the next line. The round 41 record already named this as a round-42 candidate.
- Why it costs: this is the largest type on the de/nl landing page and the first thing a German or Dutch shop owner reads. A phrase broken mid-way reads as an untranslated layout, which undercuts the native-language pages.
- Fix: in `messages/de.json` and `messages/nl.json` (`home.story…h`), join the phrase with non-breaking spaces: "an der Ladentheke." and "aan de toonbank.". Both fit in one 390 px line (about 315 px and 290 px at `text-4xl`). Alternatively make the balance `sm:text-balance`.
- Scope: ok (two message strings or one class; no copy change a visitor can read).

## Worst defect — SEO
- Page/viewport: /changelog in all ten locales (20 sitemap URLs with /roadmap, see the runner-up note). This is metadata, so it applies at every viewport.
- Element: `<title>` "Changelog | WCPOS" and H1 "Changelog" (`changelog.meta.title`, `changelog.page.title`). The meta description is "Release notes for the latest published versions of the WCPOS plugin, from GitHub." In de the title is "Änderungsprotokoll | WCPOS", in nl "Wijzigingslogboek | WCPOS", in fr "Journal des modifications | WCPOS".
- Problem: WCPOS 2.0 shipped on 9 Nov, followed by 2.0.1 to 2.0.4 in eight days. The page that holds those release notes says neither "WooCommerce POS" nor "2.0" in its title, H1 or description, and its description ends with "from GitHub", which sends the searcher off-site. Every other marketing page carries the head term in its title; this one is the outlier.
- Why it costs: queries such as "WooCommerce POS 2.0", "WCPOS 2.0 release notes" and "woocommerce pos update" are at their peak now, while 1.11 users decide whether to upgrade. The page that answers them sends a generic, single-word title to Google, so the GitHub releases page or the wordpress.org changelog tab outranks wcpos.com for its own release. Those pages carry none of the site's upgrade warnings ("Sync every till before upgrading") and no path to /downloads or /pro.
- Fix: set `changelog.meta.title` to "WooCommerce POS Changelog & Release Notes" (template adds "| WCPOS") and the meta description to "Release notes for each WCPOS plugin update, newest first, including the 2.0 releases: what changed in WooCommerce POS and what to check before upgrading." Give the H1 the same head term ("WCPOS changelog"), with each locale's own POS term. The sitemap needs no change, because /changelog already takes its lastmod from the newest release.
- Scope: ok (metadata and heading copy only; "2.0 releases" are already listed on the page; no new claims).

## Runner-up notes (max 3 lines)
- /roadmap has the same problem: its title is "Roadmap | WCPOS" (de "Produktplanung"), and it is linked from the header nav on every page. "WCPOS Roadmap: What's Next for WooCommerce POS" would fix it.
- On /downloads, the "What's new" footer reads "Full history on GitHub — Free · Desktop". The anchor text "Free" is meaningless, and the on-site /changelog, which is in the sitemap, gets no link from /downloads. Point the plugin link at /changelog.
- `metadata.siteDescription` ("Fast, reliable POS system for your WooCommerce store.") is still the stale layout fallback (rounds 40 and 41).
