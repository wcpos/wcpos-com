# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin plus apps that turns a tablet, phone or computer into a register running off the client's own WooCommerce catalog, stock and prices, even offline.
Why version 2: The "New in 2.0" line says register open/close, split payments and today's sales report are now in the free version.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, desktop and phone (same copy in every locale)
- Element: "More registers & multiple stores — Add registers beyond the free one, and run several stores, each with its own address, tax rates, receipt template, pricing and authorized users." Further down the same page, FAQ: "Each license can be activated on 2 sites, intended for one live site and one development site."
- Problem: The card never says where these "stores" live. In Pro a store is a `wcpos_store` post inside one WooCommerce install (wiki architecture/plugin-pro/stores-cpt-and-rest-api.md), so several shop locations run off a single WooCommerce site. A developer whose client has "two stores" can't tell from the page whether that means two locations on one site (covered by one licence) or two separate WooCommerce sites, which the FAQ's "one live site and one development site" seems to rule out. The capture has nothing else on the page that settles it.
- Why it costs: This is the first question an agency asks for a multi-store client, and it decides whether one licence is enough. When the page leaves it open, the developer has to ask support or Discord before recommending WCPOS. That is the sales call the page should make unnecessary, and some will choose a competitor whose page answers it.
- Fix: Change the card to "…and run several stores (shop locations) from one WooCommerce site, each with its own address, tax rates, receipt template, pricing and authorized users." Make the same change in each locale.
- Scope: ok. It restates how the product already works and changes no price or licence term. It sits next to the held "/pro stores card" item (shared stock, card link), but it does not touch either part of that hold.

## Worst defect — UI
- Page/viewport: /support, desktop 1440
- Element: H1 "WooCommerce POS help & support", which renders as "WooCommerce / POS help & support"
- Problem: The line break splits the product name "WooCommerce POS" across two lines. Line 1 is a lone "WooCommerce" and line 2 starts with "POS", so the heading reads as "WooCommerce" plus a separate "POS help". This is the first thing seen on the page developers land on to check setup and hardware answers, and it looks unfinished next to the cleanly set H1s on /extensions and /downloads.
- Why it costs: It is the main heading of the help page and it makes the page look unpolished. It also splits the exact search phrase the page is targeting.
- Fix: Join the two words with a non-breaking space ("WooCommerce POS") in the support H1 message (en, plus the other locales where the term is split the same way), so the line breaks after "POS".
- Scope: ok

## Worst defect — SEO
- Page/viewport: /de and /nl home, meta description (search results)
- Element: de "Kostenlose Open-Source-WooCommerce-Kasse für Tablet, Telefon oder Computer. Barverkäufe auch offline; Zahlungen aufteilen, Kasse öffnen/schließen gratis in 2.0." (160 chars). nl "Gratis, open-source WooCommerce-kassa voor tablet, telefoon of computer. Contant verkopen ook offline; betalingen splitsen, kassa openen/sluiten gratis in 2.0." (159 chars)
- Problem: Both are the longest descriptions on the site, and German and Dutch text is set wide. At about 920 px on desktop, Google cuts the snippet off around "…schließen" / "…openen/sluiten", which drops the "gratis in 2.0" ending. That ending is the free + 2.0 hook the English description (150 chars) gets across.
- Why it costs: On the two locale home pages that rank for "WooCommerce Kasse" / "WooCommerce kassa", the search result loses the "free" and "2.0" reasons to click.
- Fix: Cut both to about 145 chars and keep "gratis in 2.0" whole. For example, de: "Kostenlose Open-Source-Kasse für WooCommerce auf Tablet, Telefon oder PC. Barverkäufe offline; Zahlungen aufteilen und Kasse öffnen/schließen gratis in 2.0." (Trim further if still over 145.) Do the same for nl.
- Scope: ok

## Runner-up notes (max 3 lines)
- /support uses "licence" ("Activate your Pro licence", "How many sites can I use my licence on?") while /pro and the checkout use "license". The site should pick one spelling.
- /downloads phone capture shows "macOS · Detected" at 390 px. This is probably the capture user agent and not a site bug, but it should be checked with a phone user agent.
- /pro mentions nothing about stock across stores, or what WooCommerce versions are required. Requirements appear only on /downloads ("WooCommerce 9.0+"), and a developer looking at the Pro page wants them there too. The stock part is already held for the front desk.
