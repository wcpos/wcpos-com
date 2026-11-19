# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale that turns your tablet, phone or computer into a register for your WooCommerce store, using the same catalog, stock and prices, even offline.
Why version 2: The "New in 2.0" line above the kicker says that opening and closing the register, split payments and today's sales are now free. It still reads as a plain sentence rather than as news.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare hub, desktop and phone, the seven comparison cards (`compare.txt`, card descriptions under each "WCPOS vs …" H2)
- Element: "Square's POS plus a sync extension, versus a register built on WooCommerce: where in-person sales are recorded, syncing, locations, offline payments, card fees, and where Square is genuinely better." The FooSales, Oliver, WooCommerce POS, Jovvie and Vitepos cards follow the same pattern, each ending "…and where X is genuinely better."
- Problem: Each card is a table of contents, not an answer. It lists the topics the page covers, and the same closing clause repeats six times, so the grid reads as templated and every card looks alike. A shop owner who is choosing between WCPOS and Square has to open each page to learn the one-line difference, even though each page already opens with "The short answer". The hub has no visual hierarchy between cards either: same weight, same length, same link text.
- Why it costs: /compare is where a visitor who is weighing up the alternatives arrives. If the cards stated the difference, the visitor would pick the right comparison straight away and see WCPOS's position at once. The topic lists make the visitor do that work, and the repeated "genuinely better" clause wears out the honesty signal it is meant to send. This was also named last round and is still deferred.
- Fix: Rewrite each card description as a one-sentence verdict taken from that page's own short answer. For Square: "Square runs a second catalog and syncs stock to WooCommerce on a schedule; WCPOS sells from WooCommerce itself. Square wins on Tap to Pay and offline card payments." Drop the repeated "where X is genuinely better" tail. Do this in every locale.
- Scope: ok. The change is copy only, and each verdict restates facts already on its comparison page. There are no new claims and no price wording.

## Worst defect — UI
- Page/viewport: home (en, nl, de; all locales), phone 390 px, the hero CTA pair (`story-copy-blocks.tsx:116-127`, a `flex flex-wrap justify-center` row)
- Element: "Try Live Demo" / "Download Free" (nl "Live demo proberen" / "Gratis downloaden", de "Live-Demo testen" / "Kostenlos herunterladen")
- Problem: At phone width the two `size="xl"` buttons wrap onto two lines. Each keeps its content width, so the stack is ragged and centred. In en the black button is slightly wider than the red one. In nl the red one is wider. In de the gap is large: about 200 px for the red button against about 250 px for the black one. The primary action ends up the smaller, weaker shape, and the pair stops reading as one decision. The site already solves this elsewhere: `compare/choose-actions.tsx` uses `flex-col sm:flex-row`.
- Why it costs: This is the first tap target on the most visited page on phone, and it is the most polished part of the fold. Mismatched stacked buttons look like an unintended layout break. In German, the secondary "Kostenlos herunterladen" outweighs the primary "Live-Demo testen".
- Fix: Change the CTA row to `flex flex-col items-center gap-3 sm:flex-row sm:justify-center` and give both buttons `w-full max-w-xs sm:w-auto`, so they stack at the same width on phone and sit side by side from `sm:` up.
- Scope: ok. The change is two class strings in one component, with no copy change. The file is in the scroll-story folder, so check it against the owner's open scroll-story PR before branching.

## Worst defect — SEO
- Page/viewport: /de home, every viewport, the second-act H2 (`messages/de.json:284`) and the home meta description (`messages/de.json:58`)
- Element: "Ein POS. Web, Desktop, iOS & Android." and "Kostenlose Open-Source-WooCommerce-Kasse für Tablet…"
- Problem: #872 moved the de kicker to "Kassensystem", which matches the de title ("WCPOS - Kassensystem für WooCommerce") and the de /pro H1. The first H2 below it still uses the English "POS", though, and the meta description uses a third term, "WooCommerce-Kasse". The de home therefore splits its head term three ways: Kassensystem, Kasse and POS. nl is consistent ("Eén kassasysteem.", "WooCommerce-kassa"). The de H2 is the outlier.
- Why it costs: German searchers look for "WooCommerce Kassensystem". The page's most prominent heading after the H1 and its search snippet both miss that term, which weakens relevance for the query the title targets. To a German reader, "Ein POS" also reads like an untranslated string, two lines after a kicker that was just fixed for the same reason.
- Fix: de `home.story.a2.h` → "Ein Kassensystem. Web, Desktop, iOS & Android." and de `home.meta.description` → "Kostenloses Open-Source-Kassensystem für WooCommerce auf Tablet, Telefon oder Computer…", keeping the rest of the sentence and staying under 160 characters.
- Scope: ok. The change is two de message strings with no new claims. The H2 is rendered by the scroll-story, but the edit is to the message file only.

## Runner-up notes (max 3 lines)
- /compare/square "Choose WCPOS if:" is still a single 70-word run-on sentence of six conditions. At the page's decision point it should be a bullet list, the same as "Choose Square if" (fifth round named).
- /support H1 is still off the type scale: `text-3xl font-bold md:text-4xl` against the tight 48 px H1s on /pro, /extensions and /downloads, and on phone it breaks as "…help / & support".
- /downloads "Pick your device": the "·" separators still end lines in the Desktop app and Web cards at desktop width too, e.g. "macOS (Apple Silicon) ·" with "macOS (Intel) ·" wrapping below.
