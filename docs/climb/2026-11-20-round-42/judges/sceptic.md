# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source register for an existing WooCommerce store that runs on a tablet, phone or computer and sells from the store's own catalog, stock and prices, even offline.
Why version 2: The red "New in 2.0" line above the eyebrow says register open/close, split payments and today's sales are now free. It is promoted above the H1 and readable, but it lists features with no reason to switch.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: / (home), desktop and phone. The scroll-story's third act, plus the Free column of the pricing block.
- Element: H2 "Synced with WooCommerce. Yours, even offline." with body "Every sale lands in your WooCommerce store — you own the data, no middleman. Internet drops? Keep selling; WCPOS syncs when you're back online." In the Free plan list: "Offline mode" (messages/en.json `…b` at line 303 and `f4` at line 205).
- Problem: The home page is the only page that makes an unqualified offline promise. In 2.0, only cash sales and Card-tender (separate terminal) sales complete offline. Connected card readers and online gateways need a connection. /downloads, /compare/square (table, FAQ and "Where Square is genuinely better") and every comparison FAQ say this carefully. The home page tells a Pro buyer, whom the same page sends to Stripe Terminal and SumUp ("Pro connects card readers like Stripe Terminal and SumUp"), to "Keep selling" when the internet drops.
- Why it costs: Offline card payments are a strength Square openly sells, and the site's own /compare/square concedes it. A buyer who compares the two finds that the home page claims more than the comparison page. That one mismatch undermines the "every number is sourced… check everything" trust that the compare pages work to build. A merchant who believes the home page finds out at the counter that an integrated reader stops working.
- Fix: Change the body to "Internet drops? Keep taking cash and separate-terminal card sales; WCPOS syncs when you're back online." Change "Offline mode" to "Offline cash sales" (the label /compare already uses), in all 10 locales.
- Scope: ok (copy only in messages/*.json; it uses wording the site already publishes. The H2 sits in the scroll-story, so check it against the owner's open scroll-story PR before merging)

## Worst defect — UI
- Page/viewport: /de and /nl home, phone (390 px), hero H1.
- Element: de "Dein WooCommerce- / Shop an / der Ladentheke."; nl "Je WooCommerce- / winkel, aan / de toonbank."
- Problem: `text-balance` on the H1 (src/components/home/scroll-story/acts/story-copy-blocks.tsx:99) splits the prepositional phrase. It strands the preposition on a short middle line ("Shop an", "winkel, aan") and starts the last line with the article. At 36 px bold this is the largest text on the page, and the break reads as a mistake to a native speaker. This was flagged in round 41 and is still live.
- Why it costs: The headline is the first thing a German or Dutch shop owner reads. A broken phrase in the hero makes the localisation look machine-made, while competitors' localised pages (Square, Oliver) read natively.
- Fix: Bind the phrase in the de/nl hero title strings with a non-breaking space ("an der", "aan de"), or limit balancing to wider screens (`sm:text-balance`), whichever gives "…Shop / an der Ladentheke." Then check the en H1 still wraps on two lines.
- Scope: ok (one class or two locale strings; the component is part of the scroll-story, so coordinate with the owner's open PR)

## Worst defect — SEO
- Page/viewport: /de/pro and /nl/pro, all viewports. The `<title>` against the H1.
- Element: de title "Pro-Funktionen & Preise – Kasse für WooCommerce | WCPOS" vs H1 "WCPOS Pro – Kassensystem für WooCommerce". nl title "Pro-functies & prijzen – Kassa voor WooCommerce | WCPOS" vs H1 "WCPOS Pro – Kassasysteem voor WooCommerce".
- Problem: The title and the H1 of the same page target different head terms. The locale home titles use "Kassensystem/Kassasysteem für/voor WooCommerce", so the Pro title is the outlier, and the home meta adds a third variant ("WooCommerce-Kasse").
- Why it costs: The title is the strongest on-page signal. Splitting it from the H1 and from the home page weakens /de/pro and /nl/pro for "Kassensystem WooCommerce" and "kassasysteem WooCommerce", the terms the rest of the locale already targets.
- Fix: Change the de/nl /pro titles to "Pro-Funktionen & Preise – Kassensystem für WooCommerce | WCPOS" and "Pro-functies & prijzen – Kassasysteem voor WooCommerce | WCPOS" (about 62 characters each).
- Scope: ok (two metadata strings)

## Runner-up notes (max 3 lines)
- /downloads mobile LCP rose from 1.8 s (round 41, perf 99) to 3.0 s (perf 94) with no new failing audit besides LCP. It may be run noise, or #885's device-link change may have moved the LCP element. Re-measure before acting.
- /compare/square lists Pro terminals two ways: the table names 8 plus Vipps (with Mercado Pago, PayArc and Windcave), but "How do card payments work?" names 6. The limits list says "As verified on 2026-10-06" while the page and Sources say "checked again 2026-11-18". Both inconsistencies sit under "Check everything."
- /compare/square "Where Square is genuinely better" opens with "Square's POS has a free plan… WCPOS Pro costs $129 or more". That concedes "free" to Square when the WCPOS core is free too. The real gap is integrated card acceptance on the free tier. needs-front-desk (price wording).
