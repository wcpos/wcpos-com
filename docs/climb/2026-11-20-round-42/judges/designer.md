# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale that turns your tablet, phone or computer into a register for your WooCommerce store, selling from the same catalog, stock and prices, even offline.
Why version 2: The red "New in 2.0" line says you can now open and close the register, split payments and see today's sales for free. It is clear, but it sits above the kicker in body size, so it still reads as a caption rather than news.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare/square, desktop and phone, the "Which should you choose?" section (`text/compare-square.txt:89-97`, `messages/en.json` `compare.square.choose.wcpos.body`). The same pattern appears on all seven /compare/<x> pages.
- Element: "Choose WCPOS if: You want every sale, online and in person, to be a WooCommerce order sold from one catalog, with no second catalog to keep in sync, run more than one store, sell outside Square's eight countries, want a register in a web browser or in desktop apps for Windows, macOS and Linux, or want to use a payment gateway or card terminal other than Square."
- Problem: The page's decision point is still one 60-word sentence that chains five unrelated conditions with commas. "No second catalog to keep in sync" repeats "sold from one catalog" inside the same clause. The two cards are side by side and both are run-ons, so neither scans. Round 41 fixed the top of the page: the short answer now opens with a bold verdict. That makes this paragraph, directly above the page's only mid-page "Try Live Demo" / "Download Free" pair, the weakest block left on the page.
- Why it costs: A shop owner who scrolls to "Which should you choose?" is checking which conditions match their shop. Five short lines can be scanned in two seconds, and each match is a reason to press the CTA right under it. One run-on reads as fine print, so the reader skips past the buttons to the FAQ.
- Fix: Render each "Choose X if" body as a bulleted list. Add an optional `items` array beside `body` in the choose component and split the existing wording into one condition per line, without "with no second catalog to keep in sync". Do /compare/square in all locales first, then the other six pages.
- Scope: ok. The change is markup plus a re-split of existing wording, with no new claims, numbers or price wording.

## Worst defect — UI
- Page/viewport: /support, desktop and phone, the ask form (`src/components/support/support-chat.tsx:276-320`)
- Element: "Tick the box below to ask your question." → three greyed chips ("How many sites can I use my licence on?" …) → "Answered by Aide · trained on the WCPOS docs & wiki" → the Cloudflare "Verify you are human" box.
- Problem: The instruction says "below", but the checkbox (`{turnstile.widget}`, line 320) is rendered last, after the chips and the credit line. Until it is ticked, the chips (`disabled={verifying}`) and the Ask button are faded to about 40% opacity. On desktop the visitor first sees a form that looks switched off, and the box that switches it on is three rows down, under the small print. In the phone capture the widget had not painted yet. That left about 150 px of empty dark space under the credit line, so the "below" instruction pointed at nothing.
- Why it costs: /support is the page people reach when something is already wrong. A form that looks disabled, with its unlock control below the fine print, reads as broken. Some visitors will leave for Discord, or leave entirely, before they find the checkbox. The suggested questions are the page's fastest route to an answer, and they are exactly the part that looks dead.
- Fix: Move `{turnstile.widget}` up to sit directly under the "Tick the box below…" hint, above the chips. Give its slot a fixed min-height (65 px, the size of the Turnstile widget) so the space is reserved before the widget paints. The credit line then closes the block.
- Scope: ok. The change moves one element and adds one class in one component, with no copy change.

## Worst defect — SEO
- Page/viewport: /de/pro and /de/downloads (also /nl/pro), every viewport: the `<title>` against the page's own H1 (`messages/de.json:411`, `:1590`, `:58`; `messages/nl.json:411`, `:58`)
- Element: /de/pro title "Pro-Funktionen & Preise – Kasse für WooCommerce | WCPOS" against the H1 "WCPOS Pro – Kassensystem für WooCommerce". /de/downloads title "WooCommerce-Kasse herunterladen – Mac, Windows & Web" against the H1 "WooCommerce-Kassensystem herunterladen". /nl/pro title "Kassa voor WooCommerce" against the H1 "Kassasysteem voor WooCommerce". The de home meta says "Open-Source-WooCommerce-Kasse", while the home title and kicker say "Kassensystem".
- Problem: On the same page, the title targets one head term and the H1 targets another. Every other de string that names the category (home title and kicker, /de/compare, /de/about-us, /de/extensions) uses "Kassensystem". These three titles and the home meta are the outliers. This is round 41's de head-term split, narrowed to the strings that sit outside the scroll-story.
- Why it costs: German searchers type "WooCommerce Kassensystem". The snippets for /de/pro and /de/downloads, two of the highest-intent pages, lead with the term the H1 and the rest of the site do not use. That weakens the title-H1 match Google uses to pick and rewrite titles. To a reader, the switch between "Kasse" and "Kassensystem" looks like two separate translations.
- Fix: Change four strings, keeping titles within about 60 characters and descriptions within 160:
  - de `pro.meta.title` → "Pro-Funktionen & Preise – Kassensystem für WooCommerce";
  - de downloads title → "WooCommerce-Kassensystem herunterladen – Mac, Windows & Web";
  - de home meta description → "Kostenloses Open-Source-Kassensystem für WooCommerce auf Tablet, Telefon oder Computer…";
  - nl `pro.meta.title` → "Pro-functies & prijzen – Kassasysteem voor WooCommerce".
  Bump the sitemap dates for those routes.
- Scope: ok. The change is message strings only, with no claims added and no scroll-story code touched. The de home H2 "Ein POS." is left for the owner's scroll-story PR.

## Runner-up notes (max 3 lines)
- de/nl home H1 on phone still breaks "…WooCommerce- / Shop an / der Ladentheke." with "an" stranded from its noun. A no-break space ("an der") or `sm:text-balance` would fix it, but the H1 lives in the scroll-story (`story-copy-blocks.tsx:99`), so it should go with the owner's PR.
- /support desktop: `text-balance` now splits the H1 as "WooCommerce / POS help & support", which separates the "WooCommerce POS" noun phrase. A non-breaking space between "WooCommerce" and "POS", or a wider measure, keeps it together.
- /pro H1 "WCPOS Pro for WooCommerce POS" says POS twice in seven words; the nl/de H1s ("WCPOS Pro – Kassensystem für WooCommerce") read better than the en one.
