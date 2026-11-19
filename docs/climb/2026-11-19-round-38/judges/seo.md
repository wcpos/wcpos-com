# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: a free, open-source point of sale for WooCommerce that turns a tablet, phone or computer into the shop's register, selling from the store's own catalog, stock and prices, even offline.
Why version 2: the "New in 2.0" line above the H1 says that opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, desktop (1440×900). Both lines are on the first screen, about 180 px apart.
- Element: the hero subline "Everything in the free POS, plus payment terminals, store management at the register, full reports, and priority support." (`messages/en.json:416`), followed straight away by the "What's included in Pro?" intro "Everything in Free, plus the tools to run your whole store from the register — and priority support when you need a hand." (`messages/en.json:428`).
- Problem: the first two sentences on the purchase page make the same promise twice: "Everything in [free], plus … priority support". The second adds nothing that the H1 subline and the feature cards below it don't already say. It also switches from "the free POS" to "Free" as a plan name within the same screen. On desktop, that repeat takes the space where the third feature card ("Customer-facing display") would otherwise fit above the fold. That card is cut mid-sentence at the cookie bar.
- Why it costs: /pro is where buyers decide, and the first screen should go from the promise straight to proof (the feature cards next to the price box). A repeated line reads as filler at the point where a buyer is checking what $129 buys, and it pushes a concrete feature below the fold.
- Fix: delete the `pro.features.subtitle` intro (en line 428, and the same key in the other nine locales) so "What's included in Pro?" leads straight into the cards. If the layout needs a line there, use one that adds information instead of repeating the hero.
- Scope: ok. This removes copy and adds no claim.

## Worst defect — UI
- Page/viewport: /downloads, phone (390×844). It is also below the button at 1440×900.
- Element: "Upgrading from 1.11? Sync every register first: 2.0 starts a new local database and does not carry over unsent sales." (`downloads…upgradeNote`, rendered at `src/components/downloads/download-hero.tsx:133`, after the "Download for macOS" button at line 126).
- Problem: the only data-loss warning on the page comes after the action it warns about. On phone, the line starts at the bottom edge of the first screen (y≈740 of 844), and on a first visit the cookie bar covers it, so only the first half-line is visible. The red "Download for macOS" button is fully visible above it. Someone upgrading from 1.11 on this page taps the button and installs before the warning ever shows.
- Why it costs: 2.0 has been out for ten days, so many /downloads visits are upgrades from 1.11. Unsent offline sales lost on the upgrade turn into support tickets and one-star reviews, and the page did have the warning, just below the button.
- Fix: in `download-hero.tsx`, render the `upgradeNote` paragraph above the "Download for {platform}" button (between "Install the free plugin" and the download button), with no change to the copy.
- Scope: ok. This reorders one element in one component.

## Worst defect — SEO
- Page/viewport: /de (German home), every viewport. This is the hero kicker directly above the H1.
- Element: "POINT OF SALE FÜR WOOCOMMERCE" (`messages/de.json:267`, `home.story.a1.k`).
- Problem: German is the only one of the ten locales whose hero kicker does not match its own title. The /de `<title>` is "WCPOS - Kassensystem für WooCommerce", and the meta description says "WooCommerce-Kasse". The H1 "Dein WooCommerce-Shop an der Ladentheke." names no category at all, so this kicker is the only text near the top of the page that says what the product is, and it does so in half-English. Every other locale translates it to its own title phrase: nl "Kassasysteem voor WooCommerce", fr "Point de vente pour WooCommerce", es "Punto de venta para WooCommerce".
- Why it costs: German shop owners search "WooCommerce Kassensystem" and "WooCommerce Kasse", not "Point of Sale". The title promises "Kassensystem", but the prominent text above the H1 doesn't repeat it, which weakens the title–content match on the one German page that should rank for the head term. It also looks untranslated to the German visitor that the hreflang sends there.
- Fix: set de `home.story.a1.k` to "Kassensystem für WooCommerce", the same phrase as the de `siteTitle`.
- Scope: ok. This is a one-string change in `messages/de.json`. The component is in the owner's scroll-story PR, but this edit doesn't touch it.

## Runner-up notes (max 3 lines)
- The en wording of the same FAQ question differs by page: /support asks "How many sites can I use my licence on?" (`messages/en.json:1875`), and /pro asks "…my license on?". The guide link on /support is "Activate your Pro licence", but the /pro buy box says "One license". US buyers search "license".
- The de /pro SoftwareApplication `schema.description` starts "Premium-Point-of-Sale-Plugin für WooCommerce" (`messages/de.json:420`). "Kassen-Plugin" would match the de /pro title "Kasse für WooCommerce".
- /about-us is still titled "About | WCPOS". It's the site's trust page, and a title like "About WCPOS – WooCommerce POS since 2014" would match a search.
