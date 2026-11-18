# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A till for my WooCommerce shop that turns my tablet into the register at the counter, using the same products, stock and prices as my website, even when the internet drops.
Why version 2: In 2.0 the free version lets me open and close the register, split payments and see today's sales.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: `/downloads`, every viewport. It is in the "How it fits together" list under the store diagram, just above step 2 "Pick your device — All free, all in sync".
- Element: "Every app reads and writes the same store — Ring up a sale on the desktop, refund it on your phone — one set of products, orders and customers, updating in real time." (en `howItFits.points.sync.body`, messages/en.json:1656, with the same wording in every locale)
- Problem: Refunds at the register are a Pro feature. Step 3 on the same page says so ("A licensed plugin that adds terminal payments, refunds and stock control"), the home grid badges "Order history & management … process returns" as Pro, and /compare/square lists "refunds at the register" under "Pro adds". Yet the one concrete example this page gives of everyday use is a refund on the phone, sitting in the free install story next to "All free". The phone it points to is an app the same page marks Beta.
- Why it costs: My test this week is to install the free plugin and run my market stall from my phone. I'd expect to handle a return on the phone and find I can't without paying. That is the "the site promised X" moment that makes me drop a trial and go back to Square, and the site contradicts itself on one page. Fixing it is cheap, and the trust is easy to lose.
- Fix: Swap the example for something Free does, e.g. "Ring up a sale on the desktop and the stock updates on your phone — one set of products, orders and customers, kept in sync." Do this in all ten locales. Product and stock sync is free, so nothing new is claimed.
- Scope: ok (copy only, no price or plan terms)

## Worst defect — UI
- Page/viewport: `/downloads` at phone width (390 px), the "How it fits together" diagram
- Element: The satellite label "Desktop" above the red "Your store / WooCommerce + WCPOS plugin" hub
- Problem: The hub circle sits over the bottom half of the "Desktop" label, so it reads "Desktop" cut through, and Desktop is the first app on the page. The whole diagram also renders above its eyebrow and H2 ("HOW IT FITS TOGETHER / One store at the centre. Every till in sync."), so on a phone I scroll into a floating cluster of circles with no heading to explain it.
- Why it costs: This page is where I decide which device to set up at the counter and which at the stall, and the picture meant to show that is the one element that looks broken. A clipped label on the download page makes the product look unfinished to someone deciding between it and Square's polished app. The designer named it in two earlier rounds and it is still unfixed.
- Fix: At phone width, move the diagram below the H2 (order or flex-order), and either increase the vertical offset of the Desktop node or put its label above the circle so the hub cannot cover it.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/sitemap.xml` (source `src/app/sitemap.ts`, `CONTENT_UPDATED_AT`)
- Element: `'/': '2026-10-07'`, `'/pro': '2026-10-07'`, `'/compare/square': '2026-10-06'`, `'/extensions': '2026-10-07'`, and no entry at all for `/compare/foosales`
- Problem: The sitemap's lastmod dates predate the 2.0 launch (9 Nov 2026). Since then these pages have been rewritten for 2.0: the home hero "New in 2.0", the Free card, the /pro FAQ and display card, /compare/square's 2.0 checkout and pricing sections, and the /extensions order. /compare/foosales, the comparison I came for, has no lastmod at all. The file's own comment says "Bump a route's date when its content changes".
- Why it costs: Search engines use lastmod to decide what to recrawl. Telling them the home page and the Square and FooSales comparisons haven't changed since early October slows how fast the 2.0 copy replaces the old snippets in results for "Square for WooCommerce alternative" and "FooSales alternative". Those snippets are the first thing a shopper like me reads. The seo and sceptic judges named it in round 13 and it was deferred.
- Fix: Update `CONTENT_UPDATED_AT` for /, /pro, /extensions, /compare and /compare/square to the date of their latest content change, taken from git history, and add a `/compare/foosales` entry.
- Scope: ok

## Runner-up notes (max 3 lines)
- The /compare hub subtitle names "Square, FooSales, Oliver POS" first, but the cards run Oliver, WooCommerce, Square (3rd) … FooSales (7th, last). My two shortlisted rivals should come first, in the subtitle's order.
- The home Free pricing card has no button of its own. The only button under both cards is "See Full Pricing & Features", which goes to /pro, so a Free shopper's next click leads away from Download Free.
- There is still no "Compare" item in the header nav. A shopper comparing tills finds the hub only from the footer (needs-front-desk, carried over).
