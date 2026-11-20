# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free, open-source till for my WooCommerce shop that runs on the tablet, phone or computer I already have and sells from the same products, stock and prices, even when the internet drops.
Why version 2: The red "New in 2.0" line says opening and closing the register, split payments and today's sales are now free. It answers the question, but it reads like a caption above the headline more than news.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: /compare/square, desktop and phone (compare-square-desktop-fold.jpg, compare-square-phone-fold.jpg). This is the page I open first, because Square is on my shortlist.
- Element: The heading "The short answer" sits over two descriptive paragraphs: "WCPOS is a register built on WooCommerce itself: … for a one-time payment that never switches off." and "Square for WooCommerce joins two systems: … the extension links one Square location at a time."
- Problem: The section promises an answer but gives two product descriptions of about 110 and 90 words, and no verdict. The verdict exists on the page, in "Which should you choose? / Choose WCPOS if: … / Choose Square for WooCommerce if: … want Tap to Pay or offline card payments, sell from one location …". On phone it sits about 15 screens further down, after the table, five prose sections and the "doesn't do" and "genuinely better" lists.
- Why it costs: I skim. I take my weekend market stall to places with bad signal, so the line I need is "Square if you want offline card payments or Tap to Pay; WCPOS if you want every sale to be a WooCommerce order". The page has that line, but I won't scroll that far to find it. Without it, the comparison reads as a long argument, not a decision, and I can't tell in a minute which one to try this week.
- Fix: Open "The short answer" with one sentence built from the two existing "Choose … if" lines (for example: "Choose WCPOS if you want every in-person sale to be a WooCommerce order from one catalog; choose Square if you want Tap to Pay or offline card payments at one location."). Keep the two paragraphs below it as the detail.
- Scope: ok. Copy only, built from claims already on the page. Leave the price wording in the WCPOS paragraph as it is.

## Worst defect — UI
- Page/viewport: /support, phone 390 px (support-phone-fold.jpg). Also desktop.
- Element: The three example chips ("How many sites can I use my licence on?", "Which barcode scanners are supported?", "How do I sync products from WooCommerce?") and the "Ask" button, under the line "Tick the box below to ask your question."
- Problem: The chips are pale grey outlines with grey text, and the Ask button is a dimmed maroon. Together they look disabled, as if the help box is broken. The box the hint asks you to tick, Cloudflare's "Verify you are human", sits below all three chips. So the instruction is under the input, the tick box is three rows further down, and the only interactive-looking element on screen is a dark CAPTCHA panel.
- Why it costs: A non-technical owner who comes to ask "does it work with my card reader" sees a help box that looks switched off and leaves. This is the one page where I would ask my shop-specific question before installing.
- Fix: Show the Turnstile box directly under the input, above the chips, so the hint points at the next thing on screen. Render the chips at normal text contrast; they can stay inactive until the check passes.
- Scope: ok. Layout and styling of one existing component.

## Worst defect — SEO
- Page/viewport: /compare/square, all viewports (text/compare-square.txt)
- Element: "As verified on 2026-10-06, WooCommerce's documentation for the Square for WooCommerce extension states these limits:" This is the intro to "What Square for WooCommerce doesn't do".
- Problem: The rest of the page says the Square facts were "verified 2026-10-06 and checked again 2026-11-18" (the At a glance caption, the Sources intro and the footer note). This section still shows only the October date, so the page gives two different freshness dates for the same facts.
- Why it costs: The page's whole case, to searchers, to AI answer engines and to a sceptical buyer, is "every number is sourced and dated". A stale date in its most-quoted list, the one people excerpt, weakens that freshness signal. It also makes the reader wonder whether the list was actually rechecked.
- Fix: Change the intro to "As verified on 2026-10-06 and checked again on 2026-11-18, WooCommerce's documentation … states these limits:", matching the other three date lines.
- Scope: ok. One copy string, using a date the page already states.

## Runner-up notes (max 3 lines)
- /compare/square "Choose WCPOS if:" is one run-on sentence ("… sold from one catalog, with no second catalog to keep in sync, run more than one store, …"). It would scan better as 4–5 bullets.
- /compare/square terminals: the table lists Mercado Pago, PayArc and Windcave, but the card-payments prose and the Pro list stop at Vipps MobilePay, so the two lists disagree.
- nl home on phone: the H1 breaks as "Je WooCommerce- / winkel, aan / de toonbank." with "aan" left at the end of line 2. A non-breaking space in "aan de" would fix it.
