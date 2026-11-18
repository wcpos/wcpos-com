# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS for WooCommerce that turns a tablet into the register and sells from the store's own catalog, stock and prices, even offline.
Why version 2: 2.0 makes opening and closing the register, split payments and today's sales report free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: Home, all viewports and locales. The scroll story's third act, "Bring your own hardware" (`a3.b` in `messages/*.json`).
- Element: "Works with the equipment you already have." / "Card terminals, thermal receipt printers, barcode scanners — WCPOS doesn't lock you into proprietary hardware. Plug in what's already on your counter."
- Problem: Hardware is one of the three things I have to sign off for the client, and this is the home page's only hardware statement. It names no connection type, no printer standard and no cash drawer, and it links nowhere. The details exist only in the site's own /downloads release-note copy (`downloads.fallback.v190/v194/v196`): thermal printing at 58/80 mm, USB, Bluetooth and Windows raw printing, ESC-POS, Epson and PrintNode connectors, and a cash drawer that opens after payment. Most of that never shows, because those versions are below the 2.0.x entries. The sentence also overclaims on card terminals. You can't just "plug in" any terminal. In free, a terminal is a separate device whose payment you record with the Card tender. Connecting the reader to the POS needs Pro and one of the brands on /extensions, which /pro, /compare/square and the home feature grid ("Pro connects card readers like Stripe Terminal and SumUp") all say.
- Why it costs: "Will their Epson TM-m30 and the cash drawer work, and does the Ingenico they already have connect?" is the question I'd otherwise put to sales. The home page answers "yes, anything" and gives me nothing to check it against. I either quote on trust or open a support ticket. If I quote on trust and the client finds out at install that their terminal can't connect, it's my credibility that suffers.
- Fix: Rewrite `a3.b` in every locale to use the site's existing facts. For example: "Thermal receipt printers (58/80 mm, USB or Bluetooth; ESC-POS, Epson or PrintNode), cash drawers and barcode scanners plug in. Take cards on any terminal, or connect Stripe Terminal, SumUp and more with Pro." If the act can take a link, add one to /extensions. First confirm with the owner that each of the printer and drawer items is still true in 2.0.
- Scope: ok. The copy comes from the site's own release notes, so it adds no new claim, and it is a messages-only change. It does touch the scroll-story act that the owner's open PR is working on, so check for conflicts with that PR first.

## Worst defect — UI
- Page/viewport: /downloads, phone 390 (it also shows on desktop). The "What's new" release history, with the 2.0.0 entry open by default.
- Element: The open "2.0.0 Nov 9, 2026" body. Its first line prints a bare wrapped URL as link text ("What's new: https://docs.wcpos.com/getting-started/whats-new"). Below that, about 25 bold-led bullets end with "Since beta 3, for testers on the 2.0 beta:" and "Beta 3's notes said translations were pinned to 2026.11.12; beta 3 shipped pinned to 2026.11.13."
- Problem: This hasn't changed since round 22. The phone page is still 14,620 px (device pixels), and the open 2.0.0 body takes up about 30% of it, with no "show more" break. Every bullet starts in bold, so nothing stands out. The two warnings that matter, "Sync every till before upgrading" and "needs WooCommerce 9.0", are formatted the same as the beta-tester corrections. The copy says "till" five times, while the rest of the page now says "register".
- Why it costs: On a phone, the download page reads as an unedited GitHub release dump. That undercuts the polish of everything above it, and the useful upgrade warnings get lost among tester-only detail.
- Fix: Keep 2.0.0 open, but clamp its body to about 600 px with a fade and a "Show all 2.0.0 notes" toggle, which leaves the two warnings visible. Render bare-URL link text as the URL's path title, for example "What's new in 2.0". The notes text stays as GitHub has it.
- Scope: ok

## Worst defect — SEO
- Page/viewport: The seven /compare/* pages (square, foosales, jovvie, oliver-pos, vitepos, woocommerce-pos, yith-pos), all locales. Checked on /compare/square.
- Element: The only comparison link in the body is the generic "Compare WooCommerce POS systems" back to the hub. facts.json counts 13 internal links on /compare/square, the same as home and /extensions, so the page adds no contextual links of its own.
- Problem: The seven comparison pages are the site's long-tail SEO assets, but none of them links to its siblings. For example, a "WCPOS vs Square" reader can't get to "vs FooSales" or "vs Oliver" without going back to the hub. That means less link equity and crawl depth between the pages, and no topical cluster signal. Shop-owner raised this in round 22, and it was deferred.
- Why it costs: When I evaluate, I read two or three of these pages back to back. Each extra hop through the hub loses some readers. For ranking, the sibling pages get internal links only from the hub, so the cluster ranks as seven separate pages, not one topic.
- Fix: In the shared compare page layout, above the closing CTA, add an "Other comparisons" row that links the other six pages by their existing hub titles. It needs no new copy beyond one heading key in each locale.
- Scope: ok

## Runner-up notes (max 3 lines)
- /pro "Customer-facing display … pair it to a till with a code" still says "till". /pro and /downloads otherwise say "register" now.
- Nothing links to developer docs (REST API, the `wcpos_*` hooks that the 2.0.0 notes mention, how tax is calculated). A "For developers" link under /downloads "How it fits together" would answer that without a ticket.
- /compare hub meta description is 162 characters (facts.json), so it gets truncated in search results.
