# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free add-on for my WooCommerce shop that turns a tablet into the till, using the same products, stock and prices, and it keeps working when the internet drops.
Why version 2: Version 2 adds opening and closing the register, split payments and today's sales report, all free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: all pages, desktop and phone header; home page body
- Element: header nav "Downloads · Pro · Documentation · Support · Roadmap" (`src/components/main/site-header.tsx:59-63`). The only "Compare" link on the site sits in the footer's PRODUCT column.
- Problem: I'm deciding between Square for WooCommerce, FooSales and this plugin this week. The site has honest, sourced pages for exactly that choice (/compare/square, /compare/foosales), but neither the header nor the home page links to them. On phone, "Compare" is about 9 screens down, in the footer. The home pitch never says how WCPOS stacks up against the tools I'm already looking at.
- Why it costs: The visitor most ready to buy is the one comparing tools. If I can't find the comparison, I go back to Google, land on a Square or FooSales page and read their version of it. The site's best proof page, "where Square is genuinely better", goes unread.
- Fix: Add `{ label: t('compare'), href: '/compare' }` to the header nav and the phone menu, reusing the footer's existing "Compare" message key in every locale.
- Scope: ok

## Worst defect — UI
- Page/viewport: /compare/square (and the other /compare/* pages), phone 390px
- Element: the "At a glance" table, with the column headers "WCPOS" and "Square POS + Square for WooCommerce"
- Problem: On phone, each row wraps to 5–9 lines, so the 9-row table runs for about 3 screens. The header row scrolls away after the first row and isn't sticky (`TableHeader` sits inside `overflow-auto` in `src/components/ui/table.tsx:8`). By the "Price", "Card fees" and "Offline" rows, both columns are just grey text, and nothing says which column is WCPOS and which is Square.
- Why it costs: This table is the part a skimming shop owner actually reads. Without the headers in view I have to scroll back up to check which side "$0/month per location" belongs to, or I misread it, and that is the row that decides the purchase.
- Fix: At phone width, make the comparison table's header row sticky under the site header (drop the `overflow-auto` wrapper for these tables, or add `sticky top-[header-height]` to the thead). Another option is to repeat the short column name as a small label above each cell.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /compare/square (same pattern on the other /compare/* detail pages), SERP snippet
- Element: title "WCPOS vs Square for WooCommerce (2026): An Honest Comparison | WCPOS" (about 69 chars) and a description of about 220 chars ("WCPOS and Square POS with the Square for WooCommerce extension, compared by the maker of WCPOS — where in-person sales are recorded, …")
- Problem: Google cuts the title at about 60 chars, so it shows as "…An Honest Compa…". The brand appears twice ("WCPOS vs" and "| WCPOS"). The description is cut off before it gets to anything a searcher wants (fees, offline, which to pick).
- Why it costs: These pages target "Square for WooCommerce vs …" searches. A truncated title and description lowers click-through on exactly the comparison queries a shop owner like me types.
- Fix: Drop the "| WCPOS" suffix on the compare detail pages, e.g. "WCPOS vs Square for WooCommerce (2026): Honest Comparison". Trim the description to about 155 chars and lead with the answer, e.g. "Square POS doesn't sync sales into WooCommerce; WCPOS records every sale as a Woo order. Fees, offline, devices, and when Square is the better pick."
- Scope: ok

## Runner-up notes (max 3 lines)
- Home hero sub-line "WCPOS turns the tablet into your register": "the tablet" reads as a typo for "your tablet". It's also the only device named, which undersells the market stall (phone) case shown below.
- /compare phone: the first screen and a half are preamble (intro plus the "Who runs this comparison" box) before the first "WCPOS vs …" card. Moving the disclaimer below the list would put the choices on screen one.
- /compare/square phone: the fold is all intro and disclaimer; "The short answer" starts on screen 2.
