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
- Page/viewport: /pro, every viewport (en). This is the "Customer-facing display" card in "What's included in Pro?", which is cut by the fold at 1440×900.
- Element: "Put a screen in front of your customer: open the display in any browser and pair it to a till with a code." (`messages/en.json:440`)
- Problem: I named this last round and it is still live. It is the only "till" left in the body of the en marketing pages. Every other line on /pro calls the device a "register": "More Registers & Multiple Stores", "run your whole store from the register", "Reports Across Days, Registers & Stores", and the FAQ's "it runs one register". So does the home hero ("turns the tablet into your register"), and so does /downloads ("Sync every register first"). On the purchase page, the one card describing a newer Pro feature uses a different noun for the same device.
- Why it costs: /pro is where buyers decide. A buyer reading "till" has to work out whether it means a register, a cash drawer or another piece of hardware they need to buy, and that doubt lands next to the buy box. US shop owners search "POS register" and "cash register for WooCommerce", not "till".
- Fix: in `messages/en.json` `pro.features` (customer-facing display description), change "pair it to a till with a code" to "pair it to a register with a code". Check that each other locale uses its own "register" word in this string.
- Scope: ok. This is a one-word copy change with no new claim.

## Worst defect — UI
- Page/viewport: /extensions at `md` and up (seen at 1440×900).
- Element: the empty band between the hero line "Extensions marked Pro need WCPOS Pro." and the first group heading "Card terminals and payments".
- Problem: the gap is still about 225 px. The hero text ends near y≈345 and the H2 sits at y≈570. The hero section's bottom padding and the list section's top padding stack, with a background change at y≈457 in between. This is the fifth round with no change. At 1440×900 the first screen shows only the top row of cards, and the cookie bar covers their "Documentation →" links.
- Why it costs: visitors come to this page to check "does my card terminal work with WCPOS?". Most of the first screen is empty dark background, so the hero reads as if it were the whole page, and the catalog starts at the fold.
- Fix: in `src/app/[locale]/(main)/extensions/page.tsx`, give the list section a shorter top (`md:pt-12`) or trim the hero bottom (`lg:pb-14`), so the gap is about 100 px.
- Scope: ok. This is spacing on one page.

## Worst defect — SEO
- Page/viewport: home (`https://wcpos.com/` and its nine locale homes), every viewport. This is the page's structured data.
- Element: the home JSON-LD is `["Organization", "SoftwareApplication"]` (facts.json). No page has a `WebSite` block: `grep -rn "WebSite" src` finds nothing. Round 36 listed it under "Deferred".
- Problem: this is the third round in a row I have named it. Google's site-name system chooses the name shown above every result, and its preferred signal is `WebSite` structured data (`name`, `url`) on the home page. Without it, Google falls back to the title, `og:site_name` and headings, and on this site they pull different ways:
  - The title says "WCPOS - Point of Sale for WooCommerce".
  - The hero eyebrow and H1 lead with "WooCommerce".
  - The H1s on /downloads, /support, /extensions and /pro say "WooCommerce POS".
  - The layout's own comment (`src/app/[locale]/layout.tsx:115`, #590) records "at least six naming variants of the product … plus an unrelated Automattic product using the old name".

  That is the case in which Google's guidance says to declare the site name explicitly.
- Why it costs: the site name appears on every listing: home, /pro, /downloads and the eight /compare pages that compete for "WooCommerce POS" and "Square for WooCommerce alternative". If Google shows "WooCommerce POS" or "wcpos.com", the result blurs into Automattic's own WooCommerce POS, which is listed on the same results page and is one of the products /compare covers. The Organization block already does the entity work, and `WebSite` is the one missing, cheap piece.
- Fix: in `src/app/[locale]/(main)/page.tsx`, beside the existing SoftwareApplication script, add `{"@context":"https://schema.org","@type":"WebSite","name":"WCPOS","url":"https://wcpos.com/"}`, plus a test in `page.test.tsx` that checks for it.
- Scope: ok for `name` and `url`. An `alternateName` (for example "WooCommerce POS") is a brand-naming call for the front desk, so leave it out.

## Runner-up notes (max 3 lines)
- /about-us is still titled "About | WCPOS" (`messages/en.json:1768`). A title like "About WCPOS – WooCommerce POS since 2014" would give the page that carries the site's trust signals a title that matches a search.
- The /downloads H2 "One store at the centre. Every register in sync." uses British "centre" on an otherwise US-spelled page ("catalog", "license", "authorized").
- The Organization JSON-LD has no `foundingDate` (2014 is visible on home) and no `description`. Both are cheap entity signals that repeat facts already on the page.
