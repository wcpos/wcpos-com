# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce that turns a tablet into the store's register and sells from the store's own catalog, stock and prices, even offline.
Why version 2: The "New in 2.0" line says that opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, phone and desktop, all locales. This is the "Get Pro" buy box.
- Element: Under "Get Started" the only proof is "One-time payment — never auto-renews…", "Card, PayPal or Bitcoin" and "5,000+ active stores" (pro.txt lines 63–69). The page has no customer voice anywhere. The home page has four wordpress.org reviews. One of them comes from a Pro buyer: "…bought the lifetime Pro license a few months ago — worth it, I think. Paul is responsive on Discord, even on weekends." — adeline, wordpress.org review (translated from French).
- Problem: /pro is the only page that asks for money, and it is the page with the least social proof. A store count is a claim the site makes about itself. The one review written by someone who paid for Pro appears on the free-product page and not at the paid decision.
- Why it costs: A visitor who arrives at /pro from search ("WCPOS Pro", "WooCommerce POS pricing") has not seen the home page. The buy box is where a hesitant buyer decides, and nothing there comes from another shop owner. adeline's quote answers the two doubts a buyer has at that moment: whether Pro is worth it, and whether support responds.
- Fix: Under "5,000+ active stores" in the /pro buy box, show the existing adeline quote and attribution. Reuse the home message key and the testimonial markup. Add no new quote.
- Scope: ok. The quote and its attribution already exist and are already published. The price wording and plan terms are untouched.

## Worst defect — UI
- Page/viewport: /downloads at phone 390×844, all locales. /support and /extensions have the same problem.
- Element: The hero band above the "DOWNLOADS" eyebrow and the H1 "Download WooCommerce POS". It comes from `spacing="hero"` (`py-20`, `src/components/ui/section.tsx:24`) in `download-hero.tsx:61`. `support-chat.tsx:327` and `extensions/page.tsx:71` use the same spacing.
- Problem: About 80 CSS px of empty band sits between the header and the eyebrow. As a result, the first phone screen ends at "Install the free plugin", and the primary "Download for macOS" button and the "Upgrading from 1.11?" note are below the fold (downloads-phone-fold.jpg). On /extensions no terminal card is fully visible on the first screen. Rounds 28 and 29 removed the same gap on /compare/* and /pro. These three pages were deferred again in round 30 and are now the only heroes that still have it.
- Why it costs: /downloads is the conversion page for the free product. On a phone, the visitor sees the platform picker but not the button that acts on it. The /downloads mobile Lighthouse score is the lowest of the five measured (82, LCP 3.0 s, TBT 460 ms), so the first screen also feels slow.
- Fix: Give the three heroes the phone top padding that /pro and `compare-layout.ts` use (`pt-10 md:pt-24 lg:pt-28`), and keep the bottom padding and the desktop padding.
- Scope: ok. This is a spacing change only.

## Worst defect — SEO
- Page/viewport: /es and /it home, meta description (the search snippet, every viewport).
- Element: es: "Punto de venta gratuito para WooCommerce. Vende sin conexión, divide pagos, abre y cierra la caja, gratis en 2.0. Apps web y escritorio; iOS y Android en beta." it: "Punto vendita WooCommerce gratuito. Vendi offline, suddividi i pagamenti, apri e chiudi la cassa, gratis in 2.0. App web e desktop; iOS e Android in beta." (`messages/{es,it}.json` `home.meta.description`)
- Problem: Round 30 (#829) put "open source" back into the de, fr and pt home descriptions. Since then, the en, de, fr, nl, pt, ja, ko and zh descriptions all say open source, and es and it are the only two that don't. My round-30 note listed es and it as already compliant; that was wrong. Each page's own fold says "Gratis y de código abierto" / "Gratuito e open source", so the snippet leaves out a claim the page itself makes.
- Why it costs: The Spanish snippet serves Spain and all of Latin America, one of the largest WooCommerce audiences. "Open source" is the main thing that separates WCPOS from Square, FooSales and Oliver in the results around it, and someone searching "TPV WooCommerce gratis" or "cassa WooCommerce open source" sees only "gratuito". The rest of the snippet ("2.0", features, platforms) already matches the other locales, so this is the last gap in the home snippets.
- Fix: Change the opening of each string. es: "TPV gratuito y de código abierto para WooCommerce." it: "Punto vendita WooCommerce gratuito e open source." Trim the platform clause if needed to stay within the existing 160-character test. Keep the current offline wording.
- Scope: ok. This is copy only and repeats a claim already on the page. It leaves the offline wording as it is now, which is a front-desk hold.

## Runner-up notes (max 3 lines)
- The /pro meta description in de, fr and pt leaves out reports, while en, es, it, nl, ja, ko and zh all end with "full reports". Reports across days, registers and stores is the 2.0 split between Free and Pro, so this is copy only.
- The home SoftwareApplication JSON-LD has no `softwareVersion`, but the /downloads one has it (2.0.4). During the 2.0 launch month, the home entity could carry the same `freeVersion`.
- The /pro text still says "pair it to a till with a code". Everywhere else the site says "register".
