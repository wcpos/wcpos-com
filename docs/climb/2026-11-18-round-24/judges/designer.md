# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce. It turns a tablet into the shop's register and sells from the online store's own catalog, stock and prices, even offline.
Why version 2: The red "New in 2.0" line above the kicker answers it on desktop and phone, in en, nl and de: in 2.0 you can open and close the register, split payments and see today's sales for free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: Home, desktop and phone, all locales. This is act 3 of the scroll story, "BRING YOUR OWN HARDWARE" (`messages/en.json:298`).
- Element: "Works with the equipment you already have. Card terminals, thermal receipt printers, barcode scanners — WCPOS doesn't lock you into proprietary hardware. Plug in what's already on your counter."
- Problem: "Card terminals" comes first in the list, and the act ends "Plug in what's already on your counter". That promises any terminal the owner already has will connect. Further down the same page, the feature card says the opposite: "take cash or card on your own terminal … Pro connects card readers like Stripe Terminal and SumUp." /extensions shows that a connected terminal means a Pro extension for one of a fixed set of brands. In free 2.0, a terminal that sits on the counter is only recorded as a "Card" tender. It is never plugged in.
- Why it costs: The card terminal is the first piece of hardware a shop owner checks. Someone with a Moneris or Verifone terminal reads "plug in what's already on your counter", installs WCPOS, and finds that nothing connects. A home-page promise that the page itself contradicts lowers trust in every other claim on the page, including the 2.0 line. This is the second round this defect has been named (woo-dev in round 23).
- Fix: Reword act 3's body to say what is true. For example: "Receipt printers and barcode scanners just work. Take card payments on the terminal you already have and record them in WCPOS, or connect Stripe Terminal, SumUp and more with Pro." Update all locales.
- Scope: ok. This is a copy change to one existing message that uses facts the page already states. It makes no new claim and changes no pricing.

## Worst defect — UI
- Page/viewport: /compare/square, phone (390), all locales. The same pattern is on /compare/foosales, /compare/vitepos and /compare/yith-pos. The round-24 phone capture is cut off before this section, so the evidence is the round-23 after-shot `after/square-sources-more-phone.jpg`. The markup has not changed since: `square/page.tsx:338-343`.
- Element: the new "Sources" list, for example "Square plans, and the card rate on Square Free: http / s://squareup.com/us/en/point-of-sale/software/pricing" and "Tap to Pay on iPhone: https://squareup.com/help/us/en/article/7786-get-started-with-tap-to-pay-on-iphon / e".
- Problem: Each source's link text is its full raw URL, rendered `break-all`. At 390 px every item becomes two or three lines of underlined URL that break mid-word: "http / s://", "square / up.com", "iphon / e". The short, readable label sits in grey before it, while the bold white underlined weight falls on the least readable string. The 14 Square items form a wall of underlines roughly a phone screen tall.
- Why it costs: The Sources section exists to earn trust, and on phone, where most of these visitors are, it looks broken and machine-made. A reader can't scan which source backs which claim. Because the pattern is shared, every spoke that has Sources carries the same defect, in all ten locales.
- Fix: Make the label the link text and follow it with the bare host in muted text, for example "<a>Square plans, and the card rate on Square Free</a> · squareup.com ↗", using `new URL(url).hostname`. Drop `break-all`. Apply the change to the four Sources lists, or to one shared component they all use.
- Scope: ok. This is markup and styling on existing pages. The URLs and labels stay the same.

## Worst defect — SEO
- Page/viewport: /compare hub, all locales. This is the meta description (`messages/*.json` `compare.hub.metadata.description`).
- Element: "Honest, sourced comparisons of point of sale systems for WooCommerce — architecture, real free-tier limits, pricing, offline support, and when to choose each one." It is 162 characters in en, 187 in de, 192 in nl, 202 in es and 204 in fr.
- Problem: It runs over the roughly 155-character snippet in every locale, and by 30–50 characters in de, nl, es and fr, so Google cuts it mid-phrase. It also names none of the seven products the hub compares. "Square", "FooSales", "Oliver POS", "Jovvie", "Vitepos" and "YITH" are the words people actually search for and that SERPs bold, and all of them are missing. The spokes are tight, but the hub's metadata is still generic.
- Why it costs: The hub is the cluster's entry page and the target of every spoke's breadcrumb. A truncated, generic snippet loses the click to a competitor's own "X alternatives" page. Round 23 also noted that the metadata length test doesn't cover the hub, so the overrun went unnoticed.
- Fix: Rewrite it to 155 characters or fewer in each locale and name the rivals, for example "Sourced comparisons of WCPOS with Square, FooSales, Oliver POS, Jovvie, Vitepos, YITH and WooCommerce's POS: pricing, offline and free-tier limits." Add the hub to the metadata length test.
- Scope: ok. This is a metadata field and a test, with no new claims.

## Runner-up notes (max 3 lines)
- /extensions phone: the "Pro" chip still drops onto its own indented line under Mollie, PayArc, PayPal Reader, Square, Stripe and SumUp, but sits inline after Mercado Pago and Windcave (`extensions/page.tsx:112-121`). Third round. Stack the chip flush left under every title.
- /support phone: "Answered by Aide · trained on the WCPOS docs & wiki" sits about 8 px above the Turnstile box, so it reads as the widget's label. The H1 also breaks before "& support".
- /pro still says "pair it to a till" in "Customer-facing display", while the rest of the site says register. /pro's SoftwareApplication `operatingSystem` still leaves out Web (`pro-product-json-ld.tsx:49`).
