# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin plus apps that turns a tablet, phone or computer into a register running off the client's existing WooCommerce catalog, stock and prices, even offline.
Why version 2: 2.0 makes register open/close, split payments and today's sales report free; it's on the kicker above the H1, but it reads as a feature list, not as the reason to upgrade or switch.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: /pro, desktop and phone (same wording on /compare/square "Multiple stores / locations" row and FAQ)
- Element: "More registers & multiple stores — Add registers beyond the free one, and run several stores, each with its own address, tax rates, receipt template, pricing and authorized users."
- Problem: The list of what each store has to itself leaves out stock, and the card never says these "stores" are locations inside one WooCommerce site. The docs (docs.wcpos.com 2.x stores/index.mdx, "Stock") say: "All stores share the same WooCommerce stock. To count stock per store, use ATUM Multi-Inventory", and "Stores are places inside one WooCommerce site." The site says neither. It already lists the WCPOS ATUM Integration on /extensions ("linking inventory locations to POS stores"), but nothing points a two-shop buyer there.
- Why it costs: With a two-store client, my first question is "does each shop get its own stock count, and is this one Woo site or two?" Read next to the FAQ's "2 sites, one live and one development", the card leaves both questions open. That is the point where I stop recommending and book a sales call, or I recommend it and find out after the client has paid.
- Fix: Add one sentence to the /pro card (messages `pro` multi-store body) and to the /compare/square multi-store row: "Stores are locations in one WooCommerce site and share its stock; give each store its own stock with the ATUM integration." Link "ATUM integration" to /extensions.
- Scope: ok (documented 2.x behaviour, no pricing or licensing change)

## Worst defect — UI
- Page/viewport: /downloads, phone 390x844
- Element: the hero download card: "Every app connects to the free WordPress plugin — install it first." / "Install the free plugin" / "Upgrading from 1.11? Sync every register first: 2.0 starts a new local database and does not carry over unsent sales." / then "Download for macOS"
- Problem: The H1, subtitle and six-tile platform picker push the card's primary red "Download for <platform>" button below the first screen. On the phone fold only its top edge shows, cut off at about y=1460 and covered by the cookie bar. The upgrade warning (three lines of small grey text) sits above the button the page exists for.
- Why it costs: A visitor who taps "Download" from the nav lands on a page where the download button can't be seen, and the first thing they read is a warning meant only for 1.11 users. Perceived friction lands on the most direct conversion page.
- Fix: Move the "Upgrading from 1.11?" note under the Download button (keep it inside the card), so the button sits directly under "Install the free plugin" and above the phone fold.
- Scope: ok

## Worst defect — SEO
- Page/viewport: / (home), all viewports
- Element: features grid "Smooth checkout flow — … Pro connects card readers like Stripe Terminal and SumUp." (and story act "Pro connects Stripe Terminal, SumUp and more.")
- Problem: The home page names the card terminals twice in plain text, but its body never links to /extensions, the page whose title targets "WooCommerce POS Extensions & Card Terminals". /extensions gets only a footer link from home (facts: 15 internal links on home, none contextual to /extensions).
- Why it costs: The strongest page on the site passes no in-context anchor to the page built to rank for "WooCommerce POS card terminal / Stripe Terminal / SumUp". For a developer it's a dead end: the first mention of hardware gives no link to the list of supported readers.
- Fix: Wrap "Stripe Terminal and SumUp" in the features-grid copy in a link to /extensions. Do it there, not in the scroll-story act, which is in the owner's open PR.
- Scope: ok

## Runner-up notes (max 3 lines)
- /pro desktop pricing card: "Updates & support for 1 / year" wraps an orphan "year" beside $129 (layout only, but it touches the price block, so it may be front-desk).
- /pro never says whether stock and price edits in the POS write straight to WooCommerce products. "kept in sync with WooCommerce" appears only on Customer management.
- /support has only Organization JSON-LD, though its three suggested questions could carry a FAQPage like /pro does.
