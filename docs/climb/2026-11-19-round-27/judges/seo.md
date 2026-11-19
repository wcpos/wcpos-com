# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce that turns a tablet (or any device) into the store's register, selling from the same catalog, stock and prices, even offline.
Why version 2: The "New in 2.0" line says opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: `/downloads`, phone and desktop, first screen (and every platform tab).
- Element: The only button in the detected-platform card is "Download for macOS". The step the visitor needs first is a sentence: "Every app connects to the free WordPress plugin — install it first.", where "free WordPress plugin" is an inline link.
- Problem: The page says the plugin must come first, but the only call to action above the fold is the app installer. The plugin gets a button only in step 1 of "Three steps to your first sale", about 1,800 px further down on phone. This is the third round it has been raised.
- Why it costs: A shop owner who arrives from "download WooCommerce POS" clicks the big button, opens the app, and finds there is no store to connect to. That is the most likely point to lose them between the download and a first sale. It also leaves the page's top commercial query ("WooCommerce POS plugin") without a matching CTA on the page that ranks for it.
- Fix: Turn the "install it first" line into a secondary button, "Get the free plugin (WordPress.org)", placed before the platform download button, or make it a numbered "1 · Plugin  2 · App" pair inside the card.
- Scope: ok. This is markup and styling inside an existing card, with no new claim.

## Worst defect — UI
- Page/viewport: Every page, phone (390×844), first visit. Seen on home, /downloads and /compare/square.
- Element: The cookie banner "We use an anonymous analytics cookie to understand how the site is used. No ads, no third-party tracking. Privacy policy [Decline] [Accept]".
- Problem: The banner is set as three wrapped lines of about 17 px body text, with the buttons on their own row below. It covers about 270 of 844 px, roughly a third of the first screen. On home it hides the hero device image. On /downloads it cuts the plugin note in half and hides the "Download for macOS" button. On /compare/square it covers "The short answer" mid-sentence. The deferred list has carried it since round 26.
- Why it costs: The first phone screen is where the 10-second test happens and where the page's primary CTA should be. On /downloads the banner removes the CTA from the fold entirely. Mobile visitors are the majority of organic traffic, so this hurts engagement on every landing page.
- Fix: On phone, make the banner compact: text at 14 px, one short line ("Anonymous analytics cookie, no ads or tracking. Privacy policy"), and the Decline/Accept buttons inline on the right, keeping it under about 110 px tall.
- Scope: ok. This is component styling plus one short copy variant; the consent behavior is unchanged.

## Worst defect — SEO
- Page/viewport: `/downloads` in de, es, fr, it, nl and pt, and `/pro` in es, fr, it and pt. Search-result titles, all viewports.
- Element: `downloads.meta.title` goes through the `'%s | WCPOS'` template (`src/app/[locale]/layout.tsx:37`). The rendered titles are:
  - es: "Descargar el punto de venta para WooCommerce – Mac, Windows, Linux y web | WCPOS" (80 characters);
  - pt: "Transferir o ponto de venda para WooCommerce – Mac, Windows, Linux e Web | WCPOS" (80);
  - fr: 78; it: 76; nl: 76; de: 74.

  The `pro.metadata.title` values render at pt 73, fr 71, es 68 and it 65. en `/downloads` is 62 and en `/pro` is 50.
- Problem: This is unchanged since round 26, when it was deferred. Google cuts titles at about 580 px, which is roughly 55 to 60 Latin characters. In six locales the cut falls inside "– Mac, Windows, Linux…", so the platform list and the brand never show. Titles this far over the limit are also the ones Google most often rewrites from page text. The `/compare` spokes are guarded at 60 code points since round 25, but `/downloads` and `/pro` have no title-length test (`meta-description-length.test.ts` covers descriptions only), so these titles drifted unnoticed.
- Why it costs: These are the localized pages that should win "WooCommerce kassa downloaden", "descargar TPV WooCommerce" and "logiciel de caisse WooCommerce prix". A truncated or rewritten title loses the platform match ("Mac, Windows") that sets it apart from the WordPress.org listing, and it drops the brand. That lowers click-through on the commercial queries these pages were translated to capture.
- Fix: Shorten each string so the rendered title, including " | WCPOS", is at most 60 code points. For example, es: "Descargar el TPV para WooCommerce: Mac, Windows y web"; fr /pro: "Tarifs et fonctions Pro – Caisse WooCommerce". Add `downloads.meta.title` and `pro.metadata.title` for all Latin-script locales to a length test, counting the 8-character suffix.
- Scope: ok. This changes metadata strings and a test, with no new claims.

## Runner-up notes (max 3 lines)
- The /pro `SoftwareApplication.operatingSystem` is still "Windows, macOS, Linux, iOS, Android" (`pro-product-json-ld.tsx:49`). The shared helper used on home and /downloads ends with ", Web" and adds `softwareRequirements`. /pro should reuse that helper.
- /compare/square on phone still has about 95 px of empty space between the intro and "The short answer". This affects all seven spokes and is the fifth round it has been raised.
- The home `<title>` "WCPOS - Point of Sale for WooCommerce" still lacks the head term "WooCommerce POS" and the word "Free" (a front-desk hold). The en `/downloads` title is 62 characters, just over the limit.
