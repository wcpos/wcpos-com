# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce. It turns a tablet into the shop's register, selling from the store's own catalog, stock and prices, even offline.
Why version 2: The red "New in 2.0" line says that opening and closing the register, split payments and today's sales are now free. It is still the smallest text on the fold, but it answers the question.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /extensions, desktop and phone (both folds)
- Element: the first cards under "Card terminals and payments" are "Mercado Pago Terminal for WooCommerce", "Mollie Terminal for WooCommerce" and "PayArc Terminal for WooCommerce". "Square Terminal…" is fifth and "Stripe Terminal…" is sixth. Five of the eight terminal cards share one line: "Adds X Terminal support to WooCommerce for in-person payments."
- Problem: This is unchanged since round 29. The terminals come in alphabetical catalog order, so the desktop fold shows only Mercado Pago, Mollie and PayArc. Stripe and Square are about 1,000 px down on desktop and several screens down on phone. The page's own meta description, and the /pro card that links here, both lead with "Stripe, Square, SumUp, PayPal". The page puts those brands last.
- Why it costs: Visitors come from /pro's "See all terminal extensions" with one question: "does it work with my Stripe or Square reader?" The fold answers with regional brands, which reads as "probably not", and with identical one-line descriptions a skimmer has no reason to scroll.
- Fix: In `src/app/[locale]/(main)/extensions/page.tsx`, add a PAYMENTS_FIRST order next to the existing `PAYMENTS_LAST`, matching the meta description: Stripe, Square, SumUp, PayPal, Mollie, Windcave, then the rest. Order only, no copy change.
- Scope: ok

## Worst defect — UI
- Page/viewport: /support, phone (also desktop)
- Element: "Prefer to talk to a human?" / "Join store owners and the team in our live Discord community." It is followed only by a 600 px box that holds the WidgetBot embed.
- Problem: There is still no first-party button that opens Discord (fifth round on the carry-over list). This round's capture makes it worse:
  - The Aide form now shows an interactive Cloudflare "Verify you are human" bar. "Tick the box below to ask your question." is in small grey type, and the three starter chips and the "Ask" button are dimmed, so they look disabled.
  - Below that, after about 170 px of empty space, the human route on phone is a heading and then a 600 px plain grey skeleton. The embed only mounts near the viewport, and in the full-page capture it never painted.
  - Nothing on screen says "click here to reach a person".
- Why it costs: This page is the escape hatch for a shop owner who is stuck. If the AI box is gated and the Discord box is an empty grey slab, the page offers no visible action at all. The only working Discord link is in the footer.
- Fix: In `src/components/support/discord-section.tsx`, put a primary "Join the WCPOS Discord" button directly under the subtitle and above the embed box. Use the invite URL the footer already has, so the route works whether the iframe loads or not. Optionally cap the box at about 420 px on phone.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /de (meta description, both viewports)
- Element: "Kostenloses Kassensystem für WooCommerce. Verkaufe offline, teile Zahlungen auf, öffne und schließe die Kasse. Web- und Desktop-Apps; iOS und Android in Beta." (158 characters)
- Problem: This is unchanged since round 29. The en and nl home descriptions both say "open-source" and "free in 2.0" / "gratis in 2.0". The German one, trimmed to fit 160 characters, dropped both. The /de snippet has no version-2 hook and no open-source signal, though the German fold leads with "Neu in 2.0" and "Kostenlos & Open Source".
- Why it costs: German is one of the two long-word locales the site targets. Its home snippet is the only one that gives no reason to look now. It also leaves out "Open Source", the word that separates WCPOS from paid German POS rivals in the results.
- Fix: Rewrite in `messages/de.json` to 160 characters or fewer, keeping "Open-Source" and "neu in 2.0". Shorten the platform clause to make room, e.g. "Web & Desktop; iOS/Android in Beta". The existing length test still applies.
- Scope: ok

## Runner-up notes (max 3 lines)
- The /de/pro meta description (142 characters) drops the reports that the en and nl versions end on ("full reports" / "volledige rapporten"). Adding "und Berichte" still fits in 160.
- The home desktop H1 still rags as "…store, at / the counter." (nl: "…-winkel, aan / de toonbank."). Use `text-wrap: balance` or a non-breaking space, coordinating with the owner's story-component PR.
- The consent banner flips its button order: "Decline | Accept" on desktop, "Accept" above "Decline" on phone. Pick one.
