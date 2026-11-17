# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: a free, open-source point of sale for WooCommerce. It turns a tablet into a register that uses the store's own catalog, stock and prices, and it keeps working offline.
Why version 2: the "New in 2.0" line above the H1 says you can now open and close the register, split payments and see today's sales, all for free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, all locales, desktop and phone.
- Element: the "What's included in Pro?" grid has six cards: "Payment Terminal Integration", "Stock & Price Editing", "Order Management", "Customer Management", "Reports Across Days, Registers & Stores" and "Custom Payment Gateways". None of them sells more registers or more than one store.
- Problem: For a growing shop, a second till or a second location is the plainest reason to upgrade, and the site already says so in other places. Every /compare page says "Pro adds multi-store management, more registers, …" (`messages/en.json` `proAdds`), and the compare tables say "One register in the free version; more registers and multi-store management in Pro". /compare/square's FAQ says "WCPOS Pro manages multiple stores, with per-store addresses, tax rates, receipt templates, pricing, and authorized users". /about says Pro adds "multi-store". The page that sells Pro mentions stores only inside the reports card, so a visitor who arrives from a comparison page cannot find the feature they came for.
- Why it costs: The highest-intent visitor (two tills, or a market stall plus a shop) has to infer from a reports card that Pro covers them, or go back to /compare to check. /pro also loses the query "WooCommerce POS multiple stores", because the term appears nowhere in its body.
- Fix: Add a seventh feature card, "Multiple Stores & Registers", whose body reuses the existing compare-page wording: "Run more than one register, and manage several stores with their own addresses, tax rates, receipt templates, pricing and authorized users." Add the matching line to the home Pro list. It needs the key in all ten locales.
- Scope: ok. This is copy the site already publishes on /compare, so it adds no new claim and changes no price. The deferred "Is the free plugin limited? No." FAQ line stays with the front desk.

## Worst defect — UI
- Page/viewport: every page, desktop header (1440×900). It is clearest on /downloads and /compare.
- Element: the nav link "Pro". `site-header.tsx:60` passes it `highlight: true`, and `site-nav.tsx` `navItemClass` then gives it `text-primary`, which is red.
- Problem: The current page is shown with red text (`text-wcpos-red-accent`) and the pill. Pro is red on every page, so on /downloads two items look active: the "Downloads" pill and a red "Pro". On the home page "Pro" is the only red item, so it reads as the page you are on. The visitor loses the "you are here" cue on every page.
- Why it costs: When the nav gives two different meanings to one colour, the header looks unfinished. It also weakens the real conversion signal, because Pro stands out through a state style rather than a deliberate CTA treatment.
- Fix: In `navItemClass`, render a highlighted link that is not active with the normal `text-muted-foreground hover:text-foreground`, or with a non-red emphasis such as `text-foreground font-medium`, so red means only "current page". Do the same in the mobile branch at `site-nav.tsx:166`.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /downloads, all ten locales, desktop and phone.
- Element: `<h1>One till, every device.</h1>` (`messages/en.json:1625`, `downloads.hero.title`). Above it is the eyebrow "DOWNLOADS", which is a `<p>`. The page title is "Download WooCommerce POS for Mac, Windows, Linux & Web | WCPOS".
- Problem: I flagged this last round, and it is still there. The only H1 on the download page has no "download", "WooCommerce", "POS" or platform name, and "till" is British, while US owners search "register" or "POS". The H2s carry no query terms either ("One store at the centre. Every till in sync.", "Three steps to your first sale", "What's new"). Every other money page names WooCommerce or POS in its H1: home, /pro, /compare, /extensions and /compare/square.
- Why it costs: This page should rank for "WooCommerce POS app", "download WooCommerce POS" and "WooCommerce POS for Windows/Mac". The title and the H1 disagree, which makes Google more likely to rewrite the snippet from the H1. The page now has `SoftwareApplication` JSON-LD (#723), so the heading is the weak link left.
- Fix: Set `downloads.hero.title` to "Download WooCommerce POS for every device" (and the locale equivalents, with "Kassensystem" and "Kassasysteem" as on the home H1). Keep "One till, every device." as the subtitle, and update the H1 assertion in the downloads page test.
- Scope: ok

## Runner-up notes (max 3 lines)
- No body link from home to /compare. The compare pages are linked only from the footer, even though home is the strongest page. A "How WCPOS compares →" link next to "See Full Pricing & Features" would pass authority to the competitor-query pages.
- /pro shows five FAQ questions but has no `FAQPage` JSON-LD, while /compare/* does. "Support | WCPOS" is a thin title for a page with no keyword.
- The home meta description and H2 ("One POS. Web, desktop, iOS & Android.", "Desktop, web and mobile apps") don't say that the 2.0 phone apps are still in beta. /downloads and /compare do say beta.
