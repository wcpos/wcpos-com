# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce that turns a tablet into the store's register and sells from the same catalog, stock and prices, even offline.
Why version 2: The "New in 2.0" line above the H1 says opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: `/downloads` on desktop and phone, all locales. This is step 3 of "Three steps to your first sale" and its Pro card (`messages/en.json:1713-1716`, `downloads.*.pro.body` / `cardTitle` / `cardBody`).
- Element: "Want more? Go Pro — A licensed plugin that adds terminal payments, refunds and stock control on the same foundation." The card below it reads "Unlock the full till — Terminal payments, refunds, stock & pricing, order management, full reports, multi-store and priority Discord support."
- Problem: This is the Pro pitch a visitor sees right after "Download for macOS". It leaves out the main reason shops upgrade, which is a second register and more stores. The home Pro card and /pro both list "More registers & multiple stores" first, and the free tier is defined as "One register". Here "multi-store" is sixth in the card and "more registers" is missing. The card title also says "till", while home and /pro say "register". This was my round-19 pick, it was deferred, and it is still live.
- Why it costs: An owner installing the plugin for a second counter or a second shop isn't told that Pro is the answer, on the page with the highest intent after home. "Till" reads as foreign copy to US owners, the largest WooCommerce market, and it pulls the page away from the "WooCommerce POS register" wording the rest of the site targets.
- Fix: Lead step 3 with the existing /pro claim, e.g. "A licensed plugin that adds more registers and stores, terminal payments and stock control on the same foundation." Retitle the card "Unlock more registers & stores", using each locale's existing /pro "More Registers & Multiple Stores" string.
- Scope: ok. This reorders and rewords claims /pro already makes. Prices and plan wording stay as they are.

## Worst defect — UI
- Page/viewport: `/compare` hub on phone (390 px), `compare-phone-fold.jpg`. The source is the `COMPARISONS` array in `src/app/[locale]/(main)/compare/page.tsx:14-22`.
- Element: The lead says "Sourced, dated comparisons with Square, FooSales, Oliver POS and other WooCommerce POS options…", and the first card under it is "WCPOS vs Oliver POS".
- Problem: The cards run Oliver, WooCommerce's official POS, Square, Jovvie, Vitepos, YITH, FooSales. On phone they stack in one column, so the two comparisons the lead names first come late. Square is third, about two screens down, and FooSales is seventh, at the very bottom. The same order feeds the ItemList JSON-LD (`position` 1 = Oliver). The home pricing line added in #785 ("Weighing up Square or FooSales? See how WCPOS compares") sends visitors here with exactly those two in mind, and the hub doesn't show either of them first.
- Why it costs: A shop owner who clicks through to compare against Square has to scroll past three or four unrelated cards on a phone. The ItemList also tells search engines that Oliver is the hub's lead item, not Square, the competitor with by far the most "Square for WooCommerce" / "Square POS WooCommerce" search demand.
- Fix: Reorder `COMPARISONS` to match the lead: Square, FooSales, Oliver, WooCommerce's official POS, then Jovvie, Vitepos and YITH. The ItemList follows automatically.
- Scope: ok. This only reorders an array. Copy and claims stay the same.

## Worst defect — SEO
- Page/viewport: Home on every locale (`/`, `/de`, `/nl`, …) and `/downloads`, both viewports. The source is `src/lib/software-application-json-ld.ts:9`, called with no locale from `src/app/[locale]/(main)/page.tsx:70`.
- Element: `{"@type":"SoftwareApplication","name":"WCPOS","url":"https://wcpos.com", …}`, which has no `description`.
- Problem: The site's main entity markup is hard-coded in English. On `/de` and `/nl`, whose canonicals are `https://wcpos.com/de` and `https://wcpos.com/nl`, the JSON-LD still gives `url: https://wcpos.com`, so the structured data names a different URL from the page's canonical and hreflang. It also has no `description`, so the markup never says "point of sale for WooCommerce" or "Kassensystem für WooCommerce". The /pro SoftwareApplication already does both, with `url: localeUrl(locale, '/pro')` and a translated `description`. This is the fourth round I have raised it, and it is still live.
- Why it costs: This is the page that should rank for "WooCommerce POS" and "point of sale for WooCommerce" and their nine translations. On every non-English home page its entity signal conflicts with the canonical. It also says nothing about what the software is, which leaves the knowledge-graph and AI-answer description of WCPOS thin, in exactly the markets the hreflang work is meant to win.
- Fix: Give `wcposSoftwareApplication` a `locale` argument. Set `url: localeUrl(locale, path)` and `description: t('meta.description')`, the home string already used for `<meta name="description">`. Pass the locale from home and `/downloads`.
- Scope: ok. This is markup only, with no new claims, because the description reuses the existing meta description.

## Runner-up notes (max 3 lines)
- "Till" is still in visible headings: the /downloads tagline "One till, every device.", the H2 "One store at the centre. Every till in sync." and the /pro customer-display card ("pair it to a till"). Every other page says "register".
- The /compare hub meta description is 162 characters, so "when to choose each one" risks truncation. The en /pro H1 "WCPOS Pro for WooCommerce POS" still says "POS" twice, while de/nl read naturally.
- /compare/* pages show a "verified" date, but their JSON-LD (FAQPage, BreadcrumbList) has no `dateModified`, so the freshness signal behind the "(2026)" titles isn't in the markup.
