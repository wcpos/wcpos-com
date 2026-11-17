# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale that turns a tablet at the counter into the till for your existing WooCommerce store, with the same catalogue, stock and prices, and keeps working offline.
Why version 2: Opening and closing the register, split payments and today's sales report are now free ("New in 2.0 · … — free.").

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare/square, both viewports (and the other /compare/* pages, which share the same layout).
- Element: the page ends "Which should you choose?" → "Choose WCPOS if: …" → FAQ → "Spot an error? Email support@wcpos.com …" → footer. The only way to act is a plain-text line halfway down: "Try everything first at demo.wcpos.com/pos (login demo / demo)."
- Problem: a buyer who reads the comparison and agrees with "Choose WCPOS if" gets no button to act on. There is no "Try Live Demo" or "Download Free" anywhere in the page body. Every other marketing page (home, /pro, /downloads) ends on a clear action, so this page stands out for not having one.
- Why it costs: the comparison pages draw the highest-intent search traffic on the site ("WCPOS vs Square"). These are visitors who are about to decide, and the page hands them a footer instead of a next step. The page does the persuading and then drops the conversion.
- Fix: put the existing home `CtaSection` (Try Live Demo / Download Free, in every locale already) after the FAQ on each `/compare/*` page, and add a "Try the live demo" / "Download free" button pair inside the "Choose WCPOS if" card.
- Scope: ok (it reuses an existing component and existing copy; no new claims)

## Worst defect — UI
- Page/viewport: /compare (hub) at phone width 390 (/compare/square shows the same gap, slightly smaller).
- Element: the gap between the hero subtitle ("…and we say when a competitor is the better fit.") and the "Who runs this comparison" card.
- Problem: about 145 CSS px of empty dark band. The hero `Section spacing="hero"` adds `py-20` below the subtitle, and the next `Section spacing="compact"` adds another `py-16` above the card. On phone the stacked padding reads as a page that has stopped loading. Below the card, another ~128 px of doubled padding pushes the first comparison ("WCPOS vs Oliver POS") to the second screen. So a hub page's whole phone fold is a heading, a paragraph and empty space, with no comparison visible.
- Why it costs: the vertical rhythm on phone is broken (gaps between sections are twice the gaps inside them), and the fold of an index page shows none of the index. Phone visitors arriving from search have to scroll past dead space to find what the page is for.
- Fix: on the compare hub and detail pages, cut the hero's bottom padding on phone (e.g. `pb-8 md:pb-24` on the hero Section) and give the disclosure Section `pt-0`, so the card sits about 32 px under the subtitle and the first comparison card starts inside the first screen.
- Scope: ok (spacing classes on an existing page; no redesign)

## Worst defect — SEO
- Page/viewport: /downloads, both viewports.
- Element: JSON-LD on /downloads is `Organization` only (facts.json). Home and /pro both carry `SoftwareApplication`.
- Problem: the one page that actually offers the software (version 2.0.4, macOS/Windows/Linux/iOS/Android/Web, free) gives search engines no `SoftwareApplication` markup: no `operatingSystem`, `softwareVersion`, `downloadUrl` or `offers` price 0. The title ("Download WooCommerce POS for Mac, Windows, Linux & Web | WCPOS") targets those queries, but the structured data does not back it up.
- Why it costs: "woocommerce pos app for windows/mac" and "wcpos download" are the navigational and transactional queries this page should own. Without app markup it cannot get the software rich result (price "Free", OS), while the same markup sits on pages that are less relevant to those queries.
- Fix: emit a `SoftwareApplication` JSON-LD on /downloads, reusing the existing home schema builder, with `operatingSystem: "macOS, Windows, Linux, iOS, Android, Web"`, `softwareVersion` from the release data the page already shows, `downloadUrl: https://wcpos.com/downloads`, and `offers: { price: 0 }`.
- Scope: ok (metadata only; the version is already on the page)

## Runner-up notes (max 3 lines)
- Pro price shows the currency twice in every locale: "$129 USD /yr", de "129 $ USD /Jahr", nl "US$ 129 USD /jaar" (worst). Drop the "USD" suffix where the symbol already says it. needs-front-desk (price wording).
- On phone, the home hero buttons have different widths ("Live-Demo testen" 196 px vs "Kostenlos herunterladen" 252 px on /de). Give both `w-full max-w-xs`. The markup sits in `scroll-story/acts/story-copy-blocks.tsx`, so it collides with the owner's #204.
- The nav "Pro" is always red (`highlight: true`). On /support and /pro it competes with the red active pill, so two items look like the current page. Use a neutral colour when another item is active.
