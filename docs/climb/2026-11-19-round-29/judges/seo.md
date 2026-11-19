# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce that turns a tablet into the store's register, selling from the same catalog, stock and prices, even offline.
Why version 2: The "New in 2.0" line says that opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /downloads, phone and desktop, all locales.
- Element: "Sync every till before upgrading: 2.0 starts a new local database and does not carry over unsent 1.11 sales. Rolling back to 1.11 also starts from an empty local database…" (text line 133, inside "What's new"). The download buttons are at the top of the page (text lines ~20–40), with "Install the free plugin" on the phone first screen.
- Problem: The only warning that upgrading can lose unsent sales sits about 2,700 px below the buttons that start the upgrade, after the platform cards, the architecture diagram and the three setup steps. An existing 1.11 store that taps "Download" for macOS or Windows never reaches it. This is the fifth round it has been carried over.
- Why it costs: The 5,000+ existing stores are the people most likely to land on /downloads this month for 2.0. One lost day of offline cash sales becomes a support thread and a 1-star wordpress.org review, and those reviews are the site's main proof ("— nckllnpssy, wordpress.org review"). The warning only helps if it comes before the click.
- Fix: Show the existing sentence as a one-line note ("Upgrading from 1.11? Sync every register first: …") inside the platform card, directly above the download button, and keep the full text in "What's new". While editing, say "register" instead of "till" to match the rest of the site.
- Scope: ok. This moves and repeats existing copy and adds no new claim.

## Worst defect — UI
- Page/viewport: /pro at phone 390×844, worst in de and nl.
- Element: The hero band above the H1 "WCPOS Pro for WooCommerce POS". In de it is "WCPOS Pro – Kassensystem für WooCommerce".
- Problem: `spacing="hero"` puts `py-20` (80 px) of top padding on phone (`pro/page.tsx:166`, `ui/section.tsx:24`). The first screen therefore shows about 85 px of empty dark band, the H1, the lead and only the Yearly option. In de, "Lebenslang" sits under the consent banner and the "Get Started" button is well below the fold. Round 28 cut the same gap on /compare/* phone (#823), but /pro still has it.
- Why it costs: /pro is the page that converts. On phone, the first screen never shows both plans or the button, so a visitor comparing Yearly with Lifetime has to scroll before seeing the choice they came for.
- Fix: Give the /pro hero `pt-10 md:pt-24 lg:pt-28` (keep `pb-8`), using the same pattern as `compare-layout.ts`.
- Scope: ok. This is a spacing change only, with no change to price wording or plan terms.

## Worst defect — SEO
- Page/viewport: /pro on all ten locales (the JSON-LD on every viewport).
- Element: The /pro `SoftwareApplication` has `"operatingSystem": "Windows, macOS, Linux, iOS, Android"` and no `softwareRequirements` (`src/app/[locale]/(main)/pro/pro-product-json-ld.tsx:49`). Home and /downloads use the shared `wcposSoftwareApplication` helper, which gives `"Windows, macOS, Linux, iOS, Android, Web"` and `"softwareRequirements": "WordPress 5.6+, WooCommerce 9.0+, PHP 7.4+"`.
- Problem: The site describes the same product two ways. The paid page's markup leaves out the web app, which is the platform the hero, the compare pages ("It runs in any modern browser") and the /downloads "Web" tile all lead with. It also leaves out the WooCommerce 9.0+ requirement that 2.0 introduced. /pro is the only page whose markup carries `offers` with prices, so it is the entity that rich results and AI answer engines read for "WooCommerce POS price" or "does WCPOS Pro work in the browser". This is the fourth round it has been a runner-up, and it is still live.
- Why it costs: Inconsistent entity data across URLs weakens Google's confidence in the merged entity. A buyer who asks an assistant whether WCPOS Pro runs in a browser, or what WooCommerce version it needs, gets an answer from the paid page's markup that is incomplete.
- Fix: In `pro-product-json-ld.tsx`, set `operatingSystem` to the same string as the shared helper (export it as a constant next to `WCPOS_SOFTWARE_REQUIREMENTS`) and add `softwareRequirements: WCPOS_SOFTWARE_REQUIREMENTS`. Then add a test that /pro and the helper agree.
- Scope: ok. The markup states only facts already shown on the site, and offers and prices are unchanged.

## Runner-up notes (max 3 lines)
- /support has only one H2 ("Prefer to talk to a human?"), and below the H1 the crawlable text is the widget prompts. A short list of links to the top docs (setup, scanners, printers, sync) would give the "WooCommerce POS Help & Support" title something to rank on.
- "till" still appears on /pro ("pair it to a till with a code") and in /downloads "What's new" ("the till keeps taking cash"). Everywhere else the site says "register", including the /downloads subtitle "One register, every device."
- The home title "WCPOS - Point of Sale for WooCommerce" still has no exact-match "WooCommerce POS". It stays with the front desk as a brand call.
