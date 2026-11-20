# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: a free, open-source point of sale for WooCommerce that turns a tablet into the shop's register, using the store's own catalog, stock and prices, even offline.
Why version 2: the "New in 2.0" line above the H1 says that opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, every viewport (en). The "Customer-facing display" card in "What's included in Pro?".
- Element: "Put a screen in front of your customer: open the display in any browser and pair it to a till with a code." (`pro.features` customer-facing display description, `messages/en.json`)
- Problem: this is the only "till" left in the body of the en marketing pages. The /downloads H1 and H2 were moved to "register" for this reason. Every other line on /pro says "register": "More Registers & Multiple Stores", "run your whole store from the register", "Reports Across Days, Registers & Stores", and the FAQ's "it runs one register". So does the home page ("turns the tablet into your register"). On the purchase page, the one feature that is new to the Pro list switches to a different noun for the same device. A buyer has to work out whether a "till" is a register, a cash drawer or a separate device they need to buy.
- Why it costs: /pro gets the most purchase intent on the site, and every feature card there has to make the buyer more sure. A mixed noun in a feature description makes the feature less clear. The page also loses one more use of "register", the word US WooCommerce shop owners search with ("POS register", "cash register for WooCommerce").
- Fix: in `messages/en.json`, change "pair it to a till with a code" to "pair it to a register with a code". Check that each other locale's string uses the same word as that locale's own "register" strings.
- Scope: ok. This is a one-word copy change and makes no new claim.

## Worst defect — UI
- Page/viewport: /extensions at `md` and up (shown at 1440×900); the phone width is tighter but has the same stacked padding.
- Element: the empty band between the hero line "Extensions marked Pro need WCPOS Pro." and the first group heading "Card terminals and payments".
- Problem: the gap is still about 220 px (the hero text ends near y≈345 and the heading sits at y≈570). The hero `Section`'s `lg:py-28` bottom (112 px) and the list `Section`'s default `md:py-24` top (96 px) add together. This is the fourth round running with no change. At 1440×900 the first screen shows the heading and the top of only the first row of cards, and the cookie bar covers the cards' "Documentation →" links.
- Why it costs: the page exists to answer "does my card terminal work with WCPOS?", but most of its first screen is empty background. The hero reads as if it were the whole page, and the catalog visitors came for starts at the fold.
- Fix: in `src/app/[locale]/(main)/extensions/page.tsx`, give the list section a shorter top (`md:pt-12`) or trim the hero bottom (`lg:pb-14`) so the gap is about 100 px.
- Scope: ok. This is spacing on one page.

## Worst defect — SEO
- Page/viewport: home (`https://wcpos.com/` and its nine locale homes), every viewport. This is the page's structured data.
- Element: home JSON-LD is `["Organization", "SoftwareApplication"]` (facts.json). No page has a `WebSite` block: `grep -rn "WebSite'" src` still finds nothing.
- Problem: this was my worst SEO defect last round, and it is unchanged live. Google's site-name system picks the name it shows above every result, and its preferred signal is `WebSite` structured data (`name`, optional `alternateName`) on the domain's home page. Without that block, Google falls back to the title, `og:site_name` and headings, and on this site those disagree. The title says "WCPOS - Point of Sale for WooCommerce". The eyebrow and H1 lead with "WooCommerce". The compare pages say "the makers of WooCommerce POS". The H1s on /downloads, /support and /extensions say "WooCommerce POS". The layout's own comment (`src/app/[locale]/layout.tsx`, #590) records "at least six naming variants of the product … plus an unrelated Automattic product using the old name". Google's guidance says to declare the site name explicitly in exactly that situation.
- Why it costs: the site name appears on every listing. That includes home, /pro, /downloads and the eight /compare pages competing for "WooCommerce POS" and "Square for WooCommerce alternative". If Google shows "wcpos.com" or "WooCommerce POS" instead of "WCPOS", the brand blurs into Automattic's own "WooCommerce POS" on the same results page. The Organization block already does the entity work, so `WebSite` is the one missing piece, and a cheap one.
- Fix: on the home page only (`src/app/[locale]/(main)/page.tsx`, beside the existing SoftwareApplication script), add `{"@context":"https://schema.org","@type":"WebSite","name":"WCPOS","url":"https://wcpos.com/"}`, plus a test that checks for it.
- Scope: ok for `name` and `url`. An `alternateName` (for example "WooCommerce POS") is a brand-naming call, so leave it out unless the front desk picks one.

## Runner-up notes (max 3 lines)
- /about-us still renders as "About | WCPOS" (`about.meta.title`). A title like "About WCPOS – WooCommerce POS since 2014" would make the E-E-A-T page match a query.
- The /downloads H2 is "One store at the centre. Every register in sync.", with British "centre" on a site that otherwise uses US spelling ("catalog", "license"). It is a small mismatch on a page that ranks for download queries.
- The Organization JSON-LD has no `foundingDate` ("Since 2014" is visible on home) and no `description`. Both are cheap entity signals that repeat facts already on the page.
