# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: a free, open-source point of sale for WooCommerce that turns your tablet, phone or computer into a register using the store's own catalog, stock and prices, even offline.
Why version 2: the "New in 2.0" line above the H1 says that opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, desktop 1440×900 (both lines are on the first screen). Phone has the same repeat.
- Element: the hero subline "Everything in the free POS, plus payment terminals, store management at the register, full reports, and priority support." and, about 180 px below it, the "What's included in Pro?" intro "Everything in Free, plus the tools to run your whole store from the register — and priority support when you need a hand." (`messages/en.json`, `pro.features.subtitle`).
- Problem: the first two sentences on the purchase page make the same promise twice ("Everything in … free, plus … priority support"), and they switch between "the free POS" and "Free" as a plan name. That second line pushes the third feature card ("Customer-facing display") down, and on desktop it gets cut mid-sentence by the cookie bar.
- Why it costs: /pro is where a buyer checks what the price box buys. Filler between the promise and the proof (the feature cards) slows that check and pushes a concrete feature below the fold.
- Fix: delete `pro.features.subtitle` in all locales (or stop rendering it) so "What's included in Pro?" goes straight into the cards.
- Scope: ok (removes copy, adds no claim).

## Worst defect — UI
- Page/viewport: /downloads, phone 390×844. On desktop it is also below the button.
- Element: "Upgrading from 1.11? Sync every register first: 2.0 starts a new local database and does not carry over unsent sales." (rendered after the "Download for macOS" button in `src/components/downloads/download-hero.tsx`).
- Problem: the only data-loss warning on the page comes after the action it warns about. In the phone fold the red "Download for macOS" button is fully visible, while the warning starts at the bottom edge (y≈1480 of 1688 in the 2× capture) and the cookie bar hides it after the first half-line.
- Why it costs: ten days after 2.0, many /downloads visits are upgrades from 1.11. A user who taps the button before seeing the warning can lose unsent offline sales, and that comes back as support load and bad reviews. This is the third round it has been named.
- Fix: in `download-hero.tsx`, render the `upgradeNote` paragraph above the "Download for {platform}" button, with the copy unchanged.
- Scope: ok (moves one element in one component).

## Worst defect — SEO
- Page/viewport: /de (German home), all viewports; it is the kicker directly above the H1.
- Element: "POINT OF SALE FÜR WOOCOMMERCE" (`messages/de.json:267`, `home.story.a1.k`).
- Problem: this is still the only locale whose hero kicker doesn't match its own title. The /de `<title>` is "WCPOS - Kassensystem für WooCommerce" and the meta description says "WooCommerce-Kasse". The H1 "Dein WooCommerce-Shop an der Ladentheke." names no category, so this kicker is the only text in the hero that says what the product is, and it does so in half-English. nl ("Kassasysteem voor WooCommerce"), fr and es all translate it to their own title phrase.
- Why it costs: German shop owners search "WooCommerce Kassensystem" or "WooCommerce Kasse", not "Point of Sale". The prominent text above the H1 doesn't repeat the title's head term, which weakens the title-to-content match on the one German page that should rank for it. To the German visitor that hreflang sends there, it also looks untranslated.
- Fix: set de `home.story.a1.k` to "Kassensystem für WooCommerce" (the de `siteTitle` phrase).
- Scope: ok (one string in `messages/de.json`; no component change, so it stays clear of the owner's scroll-story PR).

## Runner-up notes (max 3 lines)
- /downloads mobile Lighthouse performance is 69 (TBT 1,070 ms, bootup 2.0 s, forced-reflow audit failing), down from 94 in round 38 with no page change. Re-measure before acting; if it holds, the platform-detect and diagram scripts are the suspects.
- /about-us is still titled "About | WCPOS". It is the trust page, and a title naming "WooCommerce POS since 2014" would match a search.
- "licence" (/support) vs "license" (/pro buy box) in en; US buyers search "license".
