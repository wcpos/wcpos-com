# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce that turns a tablet into the store's register, selling from the same catalog, stock and prices, even offline.
Why version 2: The "New in 2.0" line above the H1 says opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: `/downloads`, desktop and phone, all locales. This is the "Three steps to your first sale" block, step 3 and its Pro card (`messages/en.json:1713-1714`, `downloads.*.body` / `cardTitle`).
- Element: "Want more? Go Pro — A licensed plugin that adds terminal payments, refunds and stock control on the same foundation." The card under it reads "Unlock the full till — Terminal payments, refunds, stock & pricing, order management, full reports, multi-store and priority Discord support."
- Problem: This is the Pro pitch a visitor sees right after clicking "Download Free". It leaves out the reason most shops upgrade, a second register and more stores. /pro and the home Pro card both list "More registers & multiple stores" first, and the free tier is defined as "One register". Here "refunds" (part of order management) comes second, and "multi-store" is buried near the end of the card. The card title also uses "till", while home and /pro say "register" ("turns the tablet into your register", "Add registers beyond the free one").
- Why it costs: A shop owner installing the plugin for a second counter does not learn here that Pro is the answer, so the upsell on the busiest page after home misses its main buyer. "Till" reads as foreign copy to US owners, the largest WooCommerce market, and it splits the page's wording away from the "WooCommerce POS register" queries the rest of the site targets.
- Fix: Lead step 3 with the existing /pro claim, e.g. "A licensed plugin that adds more registers and stores, terminal payments and stock control on the same foundation." Retitle the card "Unlock more registers & stores", with each locale's equivalent of its /pro "More Registers & Multiple Stores" string.
- Scope: ok. It reorders and rewords claims /pro already makes. No price or plan wording changes.

## Worst defect — UI
- Page/viewport: All seven `/compare/*` detail pages on phone (390 px), e.g. `/compare/square` (`compare-square-phone-fold.jpg`). The source is `src/components/compare/compare-breadcrumb.tsx` (`nav … flex justify-center`, `ol … justify-center`).
- Element: "‹ Compare WooCommerce POS systems" above the H1 "WCPOS vs Square for WooCommerce".
- Problem: Round 18 (#781) left-aligned the H1 and lead below `sm`, but the breadcrumb directly above them is still centred. On the phone fold, the first line now sits centred over a left-aligned 40-word heading block and a left-aligned "The short answer". This is the same mixed alignment the fix set out to remove, now one line higher.
- Why it costs: These are the landing pages for "WCPOS vs X" and "X alternative" searches, so the first screen a comparing shopper sees looks unfinished. The back link to the hub, the only way up to the other six comparisons, floats away from the content edge, and the eye starts at the wrong x.
- Fix: Add `max-sm:justify-start` to both the `<nav>` and the `<ol>` in `CompareBreadcrumb`, so it follows the hero's `max-sm:text-left`. Desktop stays centred.
- Scope: ok

## Worst defect — SEO
- Page/viewport: Home on every locale (`/`, `/de`, `/nl` …) and `/downloads`, both viewports. The source is `src/lib/software-application-json-ld.ts`, called with no locale from `src/app/[locale]/(main)/page.tsx:70`.
- Element: `{"@type":"SoftwareApplication","name":"WCPOS","url":"https://wcpos.com", …}`, which has no `description` field.
- Problem: The site's main entity markup is fixed in English. On `/de` and `/nl`, whose canonicals are `https://wcpos.com/de` and `https://wcpos.com/nl`, the JSON-LD still says `url: https://wcpos.com`, so the structured data points at a different URL than the page's canonical and hreflang. It also has no `description`, so the markup never says "point of sale for WooCommerce" (or "Kassensystem für WooCommerce"). The /pro SoftwareApplication does both: `url: localeUrl(locale, '/pro')` and a translated `description`. This has been a runner-up for two rounds and is still live.
- Why it costs: On the page that ranks for "WooCommerce POS" / "point of sale for WooCommerce" and its nine translations, the entity signal conflicts with the canonical on every non-English home page. It also adds nothing about what the software is, which weakens the knowledge-graph and AI-answer description of WCPOS in exactly the markets where the hreflang work is meant to help.
- Fix: Give `wcposSoftwareApplication` a `locale` argument and set `url: localeUrl(locale, path)` and `description: t('meta.description')` (the home description string already used for `<meta name="description">`). Pass the locale from home and `/downloads`.
- Scope: ok. Markup only, with no new claims: the description reuses the existing meta description.

## Runner-up notes (max 3 lines)
- "Till" still appears in visible headings: the /downloads tagline "One till, every device." and H2 "One store at the centre. Every till in sync.", and the /pro customer-display card "pair it to a till". "Register" is the site's term everywhere else.
- The en /pro H1 "WCPOS Pro for WooCommerce POS" still says "POS" twice and reads as keyword-stuffed; de/nl ("WCPOS Pro – Kassensystem für WooCommerce") show the natural form.
- On the /downloads phone picker, the iOS & iPad and Android tiles carry no "Beta" tag, while step 2 lower on the page and the home device row both say "Beta".
