# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce. It turns a tablet into the shop's register and sells from the store's own catalog, stock and prices, even offline.
Why version 2: The "New in 2.0" line above the H1 says that opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /extensions, phone and desktop, all locales.
- Element: The page ends with "Extension names and descriptions come from the extensions catalog and are shown in English." and "All extensions in the documentation", then the footer (extensions.txt). It has no closing call to action. Every other card's only link is "Documentation", which leaves for the docs host. The one conversion link is the inline "WCPOS Pro" in "Extensions marked Pro need WCPOS Pro." under the H1. `src/app/[locale]/(main)/extensions/page.tsx` closes `</main>` straight after the muted Section.
- Problem: 12 of the 15 extensions carry a "Pro" badge. /extensions is the page that ranks for terminal queries ("Stripe Terminal WooCommerce POS", "SumUp WooCommerce POS"), because its title is "WooCommerce POS Extensions & Card Terminals". A visitor from those queries who scrolls through the cards finds no way to buy Pro or try the POS. The only exits are links to docs pages on another host. Home, /compare/* and /about all end with the closing band ("Ready to sell in-store with WooCommerce?" with Try Live Demo / Download Free).
- Why it costs: These visitors have buying intent: they already own a terminal and are checking support for it. The page answers "yes, supported, Pro" and then sends them to documentation rather than to /pro or the download. Search traffic that arrives with intent leaves the site without a next step.
- Fix: Render the existing closing band (`CtaSection` / `CtaBand`, as on home and the comparison pages) after the extensions Section, using its existing copy and buttons.
- Scope: ok. It reuses an existing component and copy, and adds no new claim or page.

## Worst defect — UI
- Page/viewport: /compare (hub) at phone 390×844, all locales. /extensions and /support have the same problem.
- Element: The hero band above the H1 "Compare WooCommerce POS systems". It comes from `spacing="hero"` (`py-20`, 80 px) at `src/app/[locale]/(main)/compare/page.tsx:76`. The same spacing is at `extensions/page.tsx:71` and `components/support/support-chat.tsx:327`.
- Problem: About 80 CSS px of empty band sits between the header and the H1, and the H1 then wraps to three lines. The first card's "Read the comparison →" link falls at about 752 px, under the consent banner (compare-phone-fold.jpg). On /extensions, the 80 px bottom padding plus the next Section's `py-16` leave about 140 px of blank space between the intro and "Card terminals and payments", so no terminal card is fully visible on the first screen. On /support, the "Open Discord" button added in #831 is below the fold. #834 (/downloads), /pro and `compare-layout.ts` (/compare/*) have already moved to `pt-10` on phone, so these three pages are the only heroes left with the old padding.
- Why it costs: /compare is the hub that the home "See how WCPOS compares" link and the nav point to. On a phone, its first screen is title and whitespace, with no comparison to click. The same spacing system looks inconsistent from page to page.
- Fix: Below `sm`, give the three heroes the phone padding that /pro and /downloads use (`pt-10`, with the /downloads pattern `pt-10 pb-10 sm:py-20 md:py-24 lg:py-28`). Keep the existing values from `sm` up.
- Scope: ok. This is a spacing change only.

## Worst defect — SEO
- Page/viewport: /es and /it home, meta description (the search snippet, every viewport).
- Element: es: "Punto de venta gratuito para WooCommerce. Vende sin conexión, divide pagos, abre y cierra la caja, gratis en 2.0. Apps web y escritorio; iOS y Android en beta." it: "Punto vendita WooCommerce gratuito. Vendi offline, suddividi i pagamenti, apri e chiudi la cassa, gratis in 2.0. App web e desktop; iOS e Android in beta." (`messages/{es,it}.json` `home.meta.description`, still unchanged in this round's tree)
- Problem: After #829, the en, de, fr, nl, pt, ja, ko and zh home descriptions all say open source. es and it are the only two that don't, although each page's own fold says "Gratis y de código abierto" / "Gratuito e open source". The snippet leaves out the claim that sets WCPOS apart from the competitors listed next to it in results (Square, FooSales, Oliver).
- Why it costs: The Spanish snippet serves Spain and Latin America, which together are one of the largest WooCommerce audiences. Searches such as "TPV WooCommerce gratis" or "cassa WooCommerce open source" show only "gratuito", and the query term "open source" is not in the snippet to be highlighted. It is also the last locale gap among the home snippets.
- Fix: Change only the opening of each string. es: "TPV gratuito y de código abierto para WooCommerce." it: "Punto vendita WooCommerce gratuito e open source." Trim the platform clause if needed to stay within the existing 160-character test, and leave the offline wording as it is.
- Scope: ok. This is copy only, and it repeats a claim already on the page. The offline wording, which is a front-desk hold, stays as it is.

## Runner-up notes (max 3 lines)
- The sitemap lastmod dates are stale. In `src/app/sitemap.ts`, `CONTENT_UPDATED_AT` gives 2026-11-18 for /, /pro, /extensions, /support and all /compare/* routes. #829–#835 changed each of them on 2026-11-19. Google stops trusting lastmod across a site once it is seen to be wrong, so bump the dates as the file's own comment says.
- The home hardware panel ("Pro connects Stripe Terminal, SumUp and more") still links nowhere. /extensions gets links only from the footer and from /pro, so a contextual link from home is the cheapest internal-linking win.
- The home hero says "5,000+ Active Stores" and the stats band says "5,000+ Active Installations". It should be one term on one page.
