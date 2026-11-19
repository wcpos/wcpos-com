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
- Element: Under "Get Started" the only proof is "One-time payment — never auto-renews…", "Card, PayPal or Bitcoin" and "5,000+ active stores" (pro.txt lines 60–66). The page has no customer voice anywhere. Home has one: "“Straightforward, functional and simple to use. 10/10.” — Ward, wordpress.org review".
- Problem: /pro is the only page that asks for money ($129 or $399), yet it is the page with the least social proof. A store count is a claim the site makes about itself. A named wordpress.org review is third-party proof, the site already has one, and it shows it on the free page but not at the paid decision.
- Why it costs: A visitor who arrives at /pro from search ("WooCommerce POS pricing", "WCPOS Pro") has not seen home. The buy box is where a hesitant buyer decides, and nothing there comes from another shop owner.
- Fix: Under the "5,000+ active stores" line in the /pro buy box, show the existing home review quote and its attribution, reusing the same message key and component. No new quote.
- Scope: ok. It reuses an existing, attributed quote, and the price wording and plan terms are untouched.

## Worst defect — UI
- Page/viewport: /downloads at phone 390×844, all locales. /support has the same problem.
- Element: The hero band above the eyebrow "DOWNLOADS" and the H1 "Download WooCommerce POS".
- Problem: About 85 CSS px of empty dark band sits between the header and the eyebrow (shot: about 170 px at 2x). As a result, the first screen ends at "Install the free plugin", and the primary "Download for macOS" button and the new "Upgrading from 1.11?" note (#827) are below the fold. Round 28 (#823) and round 29 (#826) removed the same phone gap on /compare/* and /pro, so /downloads and /support are now the odd ones out.
- Why it costs: /downloads is the conversion page for the free product. On phone, the visitor sees the tile picker but not the button that acts on it. Mobile LCP on this page is also the weakest of the five measured (3.4 s, perf 87).
- Fix: Give the /downloads hero, and the /support hero, the same phone top padding as /pro and `compare-layout.ts` (`pt-10 md:pt-24 lg:pt-28`, keeping the bottom padding).
- Scope: ok. This is a spacing change only.

## Worst defect — SEO
- Page/viewport: /de, /fr and /pt home, meta description (the SERP snippet, every viewport).
- Element: de: "Kostenloses Kassensystem für WooCommerce. Verkaufe offline, teile Zahlungen auf, öffne und schließe die Kasse. Web- und Desktop-Apps; iOS und Android in Beta." fr: "Point de vente WooCommerce gratuit. Vendez hors ligne, fractionnez les paiements, ouvrez et clôturez la caisse. …" pt: "Ponto de venda gratuito para WooCommerce. Venda offline, divida pagamentos, abra e feche a sua caixa. …" (`messages/{de,fr,pt}.json` `home.meta.description`)
- Problem: The en, es, it, nl, ja, ko and zh home descriptions all say "open-source" and "free in 2.0". The de, fr and pt versions dropped both when they were trimmed to 160 characters. In those three locales the snippet lists register open and close and split payments as if they were long-standing features. It gives no sign that a new major version shipped and no "open source", which is the main point of difference from Square, FooSales and Oliver in the results around it. Last round the designer noted this for de only; fr and pt have the same gap.
- Why it costs: Germany, France and Brazil/Portugal are three of the largest WooCommerce markets. The home snippet is what someone searching "WooCommerce Kassensystem" or "caisse WooCommerce" reads before they click. "Gratis in 2.0" and "Open Source" are the two click reasons the English snippet has, and these locales lose both during a launch month.
- Fix: Rewrite the three descriptions so they keep "Open Source" and "free in 2.0" within 160 characters. The platform clause can go, because /downloads covers it. For example, de: "Kostenloses Open-Source-Kassensystem für WooCommerce. Offline verkaufen, Zahlungen aufteilen, Kasse öffnen und schließen – gratis in 2.0."
- Scope: ok. This is copy only and adds no new claim. It also leaves the offline wording as it is now, which is a front-desk hold.

## Runner-up notes (max 3 lines)
- The /downloads mobile LCP has been about 3.0 s or more since round 21 (it was 1.4–1.8 s before). The hero's server snapshot is `mac-arm` (`download-hero.tsx:41`), so an Android or iOS visitor gets the card re-rendered after hydration. That is a likely late LCP candidate and is worth a trace.
- The /extensions terminals are still alphabetical, so Mercado Pago, Mollie and PayArc come before Square and Stripe. The designer raised this in round 29.
- The /pro text still says "pair it to a till with a code". Everywhere else the site says "register".
