# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free, open-source till for my WooCommerce shop that turns the tablet, phone or computer I already have into a register selling from the same products, stock and prices, even when the internet drops.
Why version 2: The red "New in 2.0" line says I can now open and close the register, split payments and see today's sales for free. It answers the question, but it still reads like a caption above the headline rather than news.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: /compare/square, phone and desktop (compare-square-phone-fold.jpg). Square is on my shortlist, so this is the first comparison I open.
- Element: Under "The short answer", the bold verdict line reads "Sales made in Square's POS don't become WooCommerce orders, and their stock changes sync on a schedule (hourly by default); every WCPOS sale is a WooCommerce order." The hero just above it promises "Here is how that compares … and when Square is the better choice."
- Problem: The new verdict (from round 41) argues only WCPOS's side. The half I need, when Square wins, is the "Choose Square for WooCommerce if: … want Tap to Pay or offline card payments, sell from one location …" line, and on phone it sits about 15 screens further down. The two paragraphs under the verdict are about 110 and 90 words, and Square's offline card payments are the second-to-last clause of the second one.
- Why it costs: I take a weekend market stall to places with bad signal. Whether I can take cards offline decides this for me. A short answer that only names WCPOS's strength reads like a sales pitch, which undoes the page's own "we tell you plainly when a competitor is the better choice" promise. I either distrust it or leave without finding the trade-off.
- Fix: Add a second bold sentence after the verdict, built from the page's existing "Choose Square" and "Where Square is genuinely better" claims, e.g. "Square is the better pick if you need Tap to Pay or offline card payments at one location." Do the same with each page's own "choose <competitor>" line on the other six /compare/<x> pages.
- Scope: ok. Copy only, reusing claims the page already makes. No price wording is touched.

## Worst defect — UI
- Page/viewport: /de and /nl home, phone 390 px (de-home-phone-fold.jpg, nl-home-phone-fold.jpg).
- Element: H1 "Dein WooCommerce-Shop an der Ladentheke." breaks as "Dein WooCommerce- / Shop an / der Ladentheke."; nl "Je WooCommerce-winkel, aan de toonbank." breaks as "Je WooCommerce- / winkel, aan / de toonbank."
- Problem: The balanced wrap leaves a stubby middle line ("Shop an", "winkel, aan") that splits the phrase "an der Ladentheke" / "aan de toonbank" across lines. The headline turns into three uneven fragments, with a preposition hanging at the end of the short middle line. It is the biggest text on the fold, in both of the long-word locales the site checks.
- Why it costs: A German or Dutch shop owner reads the headline in three jerky pieces and has to re-read it to get the meaning. It looks unpolished in exactly the place that should look most finished, and for a till they will trust with takings, first impressions count.
- Fix: Balance the hero H1 only from `sm` up (`sm:text-balance`, as round 41 suggested), or bind the phrase with a non-breaking space ("an der Ladentheke", "aan de toonbank") in de/nl, so the phone break falls as "Dein WooCommerce-Shop / an der Ladentheke."
- Scope: ok. One class or two locale strings. This is the H1 text styling, not the duplicate-H1 or scroll-story weight issue in the owner's PR. If the class lives only in a file the owner's PR changes, use the locale-string route instead.

## Worst defect — SEO
- Page/viewport: /pro, all viewports (facts.json pro-desktop/pro-phone; messages/en.json `pro` hero title).
- Element: H1 "WCPOS Pro for WooCommerce POS", under the title "Pro Features & Pricing for WooCommerce POS | WCPOS".
- Problem: The en H1 says "Pro for … POS", which reads as an add-on for some other POS, and it says nothing about what the title promises (features and pricing). The nl and de H1s already read naturally ("WCPOS Pro – Kassasysteem voor WooCommerce", "WCPOS Pro – Kassensystem für WooCommerce"), so the English page, the main ranking page, is the odd one out. The title and H1 send different intent signals for "WCPOS Pro pricing" searches, and a shop owner landing from that search sees a headline that doesn't confirm they have found the price page.
- Why it costs: The title promises "Features & Pricing" but the heading doesn't back it up, which weakens the page's relevance for "WooCommerce POS pricing" and "WCPOS Pro price" queries. It also costs a skimmer the second of confirmation that keeps them on the page.
- Fix: Change the en `pro` hero title to match the locales and the title's intent, e.g. "WCPOS Pro: features & pricing for WooCommerce POS" (or "WCPOS Pro – Point of Sale for WooCommerce"), and bump /pro's sitemap date.
- Scope: ok. One en heading string. No price, licence or plan wording changes.

## Runner-up notes (max 3 lines)
- /compare/square "Choose WCPOS if:" is still one 60-word run-on ("… sold from one catalog, with no second catalog to keep in sync, run more than one store, …"). It would scan far better as 4–5 bullets, on all seven pages.
- /de home phone: the "Neu in 2.0" line widows "kostenlos." on its own third line. A non-breaking space before it, or `text-balance` on that line, fixes it.
- /support phone: "Tick the box below to ask your question." points at nothing visible in the capture (blank space under the chips), and the chips and the Ask button still look disabled.
