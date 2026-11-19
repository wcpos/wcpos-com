# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin for WooCommerce, plus apps, that turns a tablet into the register and sells from the store's own catalog, stock and prices, even offline.
Why version 2: In 2.0, opening and closing the register, split payments and today's sales are free. This comes from the "New in 2.0" line above the H1.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, every viewport and locale. This is the first feature card under "What's included in Pro?" (`pro.features.stores.description` in `messages/*.json`). The same wording is repeated in the /compare/* "Multiple stores / locations" rows and FAQs.
- Element: "More Registers & Multiple Stores — Add registers beyond the free one, and run several stores, each with its own address, tax rates, receipt template, pricing and authorized users." Further down the same page, the FAQ reads: "Each license can be activated on 2 sites, intended for one live site and one development site."
- Problem: My client has two stores. The first thing I need to know is whether WCPOS's "stores" are locations inside one WooCommerce install, or separate WooCommerce sites. The site never says. The feature card says "several stores", while the FAQ says the license covers one live site. If my client runs two WooCommerce sites, those two lines read as a contradiction. If the client runs one WooCommerce site with two shops, I still can't tell whether both stores share one catalog and one stock pool. The docs answer it in one line (docs Multi-Store page: "WCPOS Pro lets you create separate store locations within a single WooCommerce installation"), but no marketing page carries that sentence.
- Why it costs: This is the question that decides whether I quote one Pro license or two, and whether I recommend WCPOS at all. With the site silent, I either ask on Discord or support, or I assume the worst case and go with a competitor whose multi-store page is explicit. That is exactly the "sales call" this persona wants to avoid. This is the third round I have noted it.
- Fix: Add the documented fact to the card description, in all locales: "…and run several stores — physical locations within one WooCommerce site — each with its own address, tax rates, receipt template, pricing and authorized users." Optionally link "stores" to the docs Multi-Store page. Leave the FAQ's license terms untouched.
- Scope: ok. This is a product fact already in the docs, not a change to pricing or license terms. The FAQ wording is not touched. If the front desk treats any sentence next to "2 sites" as plan terms, it needs-front-desk.

## Worst defect — UI
- Page/viewport: /support, phone 390 and desktop 1440 (full-page captures). The component is `src/components/support/discord-section.tsx`.
- Element: The box under "Prefer to talk to a human?" / "Open Discord". It is the `h-[600px]` box that holds the WidgetBot embed.
- Problem: This is unchanged from round 33. In the phone capture the box is a solid dark-grey slab about 485 px tall with nothing in it, and it is the largest element on the page. Above the H2 there is about 200 px of blank space: the chat section's bottom padding is stacked on the Discord section's top padding, below the Turnstile box. The /support load time was 3.7 s on desktop and 7.0 s on phone this round, against about 1 s for the other pages, so the slab is what visitors actually see.
- Why it costs: A developer checking long-term support finds a greyed-out AI box that needs a captcha tick before it works, and below it an empty panel. The page meant to show the project is alive looks broken instead.
- Fix: Replace the always-mounted 600 px box with a click-to-load card of about 160 px. The card holds "Open Discord" plus a "Show live chat here" button, and `<DiscordWidget />` mounts only after that button is clicked. Also remove one of the two stacked section paddings.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /support (all locales), every viewport.
- Element: The H1 "WooCommerce POS help & support", followed by a single H2, "Prefer to talk to a human?". The body otherwise holds three `<button>` example questions and the plain-text line "Answered by Aide · trained on the WCPOS docs & wiki".
- Problem: The title and description target help searches about scanners, printers and syncing, but the page has no answer content and no in-body link to any documentation page. Its only JSON-LD is `Organization`, and all 13 internal links are nav and footer links. This is the thinnest indexable top-level page on the site, and its phone load time (7.0 s) is the slowest.
- Why it costs: A developer typically arrives with a search like "WCPOS barcode scanner" or "WCPOS receipt printer setup". /support is the page whose title matches those searches, yet it gives a crawler nothing to rank and passes no link equity to the docs pages that actually answer them.
- Fix: Under the form, add a "Popular guides" list of plain links to existing docs URLs: installation, barcode scanning, receipts, stores, extensions. Also turn "WCPOS docs" in the Aide line into a link to https://docs.wcpos.com.
- Scope: ok

## Runner-up notes (max 3 lines)
- /extensions at `md` and up: about 210 px of blank space between "Extensions marked Pro need WCPOS Pro." and "Card terminals and payments", because two section paddings are stacked.
- The /compare/square "Card payments" row lists 6 terminal integrations. /extensions lists 8 terminal extensions (Mercado Pago, PayArc and Windcave are also there), so the compare page undersells the hardware range.
- /support is still the only top-level page without the closing "Ready to sell in-store" band.
