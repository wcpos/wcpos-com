# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin for WooCommerce, with apps, that turns a tablet into the register and sells from the store's own catalog, stock and prices, even offline.
Why version 2: In 2.0, opening and closing the register, split payments and today's sales are free. This comes from the "New in 2.0" line above the H1.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: Home, every viewport and locale. This is the "Bring your own hardware" panel (`home.…a3.b` in `messages/*.json`). This is the fourth round I have named it, and it is unchanged.
- Element: "Receipt printers and barcode scanners: plug in what's already on your counter."
- Problem: This sentence is still all the site says about printers. It doesn't say how a printer connects (USB, Bluetooth, network or cloud), which receipt widths work, or whether a cash drawer kicks, and it links nowhere. Each card terminal on /extensions gets its own "Documentation →" link, and the site links the barcode-scanning docs elsewhere. Yet `src/` and `messages/` contain no link to a printing or hardware docs page at all. "Receipt printing" in the Free list is a bare bullet too. Even /support's suggested questions mention scanners but not printers.
- Why it costs: Hardware is one of the four things I check before I recommend a POS. My client has a printer and a scanner at each of their two counters. "Plug in what's already on your counter" is a sales line, not a compatibility statement. To get an answer I have to search the docs or ask on Discord, and that is the sales call the site is supposed to save me.
- Fix: Add one link after the sentence, "Supported printers, scanners and cash drawers →", pointing at the docs.wcpos.com printing or hardware page (the owner confirms the URL). Use one message key per locale.
- Scope: ok if the fix is only the link. Naming connector types would need the owner to confirm they still hold in 2.0. The panel is part of the scroll-story in the owner's open PR, so make the edit on top of that PR or after it merges.

## Worst defect — UI
- Page/viewport: /support, phone 390 (worst there) and desktop 1440. The component is `src/components/support/discord-section.tsx`.
- Element: "Prefer to talk to a human?" / "Join store owners and the team in our live Discord community." It sits over a 600 px WidgetBot embed.
- Problem: The subtitle tells me to join Discord but is plain text with no link. The only way in from this section is the embedded widget. It is lazy-loaded, so in the phone full-page capture it is an empty 600 px grey box. Once it loads, it is a read-only channel view that asks me to "log in and participate in chat" inside an iframe. There is no "Open Discord" button, and the subtitle doesn't link to the invite. The header and footer Discord links are the only real entry. On phone there is also about 250 px of empty space under the Turnstile before this heading.
- Why it costs: Discord is where the site sends me for priority support and pre-sales questions ("no pre-sales team" is pinned in the widget itself). On a phone, logging into Discord inside an embedded iframe is the worst way in. I would rather open the app. A support page whose human channel is a grey box with no button looks broken.
- Fix: Add an "Open Discord ↗" button (the same invite URL as the footer link) under the subtitle, above the embed, with one message key per locale. It must also be added to the support client messages, or it will show the raw key as #817 did.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /de home (`messages/de.json` line 58, `…description`), every viewport.
- Element: "Kostenloses Kassensystem für WooCommerce. Verkaufe offline, teile Zahlungen auf, öffne und schließe die Kasse. Web- und Desktop-Apps; iOS und Android in Beta."
- Problem: The English home snippet is "Free, open-source WooCommerce POS … free in 2.0" and nl keeps both terms. The de snippet has dropped "Open Source" and "2.0". Without "2.0" it presents opening and closing the register as an existing feature rather than the free 2.0 release, so the one reason to look again now is missing. The de /pro description (142 chars) has also dropped the "vollständige Berichte" that en/nl /pro list, so both German snippets have drifted from the source.
- Why it costs: German searchers comparing WooCommerce Kassensysteme filter on "Open Source", and the 2.0 release is the news that earns a click from people who tried 1.x. The snippet is the only copy they see in the SERP. de is the largest non-English market among the judged locales.
- Fix: Rewrite the de home description to ≤160 chars with both terms, e.g. "Kostenlose Open-Source-Kasse für WooCommerce. Offline verkaufen, Zahlungen aufteilen, Kasse öffnen/schließen – gratis in 2.0. Web, Desktop; iOS/Android Beta." Add "und Berichte" to de /pro if it fits in 160.
- Scope: ok (it restates the existing en claims; no new facts).

## Runner-up notes (max 3 lines)
- /downloads mobile performance fell to 87 (LCP 3.4 s, lcp-breakdown failing; it was 94 / 3.0 s in round 29). Check whether the new card upgrade note became the LCP element or is just variance.
- /pro still never states the WordPress, WooCommerce or PHP minimums in visible copy, and the "2 sites" FAQ next to "run several stores" still leaves a two-store client unsure whether they need one license or two (front-desk hold).
- The /downloads upgrade note in the card doesn't link to the 2.0.0 release notes below it, so the rollback and app/plugin version-pairing rules stay about 2,700 px away.
