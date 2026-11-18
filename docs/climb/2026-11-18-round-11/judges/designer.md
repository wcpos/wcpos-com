# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale that turns a tablet (or any screen) into the till for your WooCommerce store, selling from the same catalog, stock and prices, even offline.
Why version 2: 2.0 lets you open and close the register, split payments and see today's sales, all free. The thin line above the kicker says so at both widths.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare (the hub), phone 390 (also desktop and every locale).
- Element: The lead "Every WooCommerce POS roundup on the web is written by a vendor ranking itself first or an affiliate ranking by commission. This one is different: published by a vendor, yes — but every fact is sourced, dated, and checkable, and we say when a competitor is the better fit." Directly below it is the "Who runs this comparison" card: "This page is published by kilbot, the maker of WCPOS. We obviously have a horse in this race — so every number is sourced and dated … and we tell you plainly when a competitor is the better choice."
- Problem: The lead and the disclosure card make the same point twice, almost word for word: vendor-written, sourced and dated, honest about when a rival wins. On phone they fill the whole first screen (about 1,300 px) and push "WCPOS vs Oliver POS", the first card, below the fold. The lead never says what the page contains: seven side-by-side comparisons, and which products they cover.
- Why it costs: A visitor who searched "WooCommerce POS comparison" gets two paragraphs of self-defence and no competitor names. That reads as defensive and delays the click into a comparison, which is the whole job of the hub. Once round 9 fixed this order on /compare/square, the hub is the one compare page that still opens with apology instead of answer.
- Fix: Rewrite `compare.hub.hero.subtitle` to say what is on the page, e.g. "Side-by-side comparisons of WCPOS with Oliver POS, WooCommerce's official POS, Square, Jovvie, Vitepos and more, each with the cases where the other product is the better fit". Keep the disclosure card, which already carries the trust argument. Do this in all ten locales.
- Scope: ok. One copy key per locale, naming only products the page already lists, with no new claim.

## Worst defect — UI
- Page/viewport: Home "Built for the demands of physical retail" cards: phone 390 in nl, and the "Reports across days, registers & stores" card on desktop in en. The same pattern shows on the /extensions Windcave card on desktop.
- Element: The "Pro" badge after a feature title, e.g. nl "Voorraad en prijzen direct aanpassen", then "Pro" alone on the next line, indented. On desktop, en "Reports across days, registers &" breaks before "stores Pro", and on /extensions "Windcave Terminal for WooCommerce" puts "Pro" alone on the next line. The badge is rendered in `src/components/ui/feature-card.tsx` as `<span className="ml-2 inline-block align-middle">` after the title, and on /extensions as `Badge … className="ml-2 align-middle"`.
- Problem: When the title fills the line, the badge drops onto a line by itself and keeps its 8 px left margin. It then floats, slightly indented, under the title, apart from the word it qualifies, in a column where every other line is left-aligned. Dutch and German titles are longer, so the break moves from card to card with the locale and the viewport: in nl at 390 px it is "Voorraad en prijzen direct aanpassen", in en on desktop it is the Reports card.
- Why it costs: The Pro badge is the only signal in that grid of what is free and what is paid. When it is orphaned it reads as stray text, not a label on the feature, and the grid looks unfinished in exactly the locales the site is localised for. It recurs on two pages, so it is a component defect, not a one-off.
- Fix: In `FeatureCard` (and the /extensions card title), keep the badge with the last word: when `title` is a string, wrap its last word and the badge in `<span className="whitespace-nowrap">`. Optionally, drop `ml-2` in favour of a leading non-breaking space, so a wrapped badge never carries an indent.
- Scope: ok. Markup in one shared component plus one page, with no copy change.

## Worst defect — SEO
- Page/viewport: /pro, all locales (en, nl, de captured), desktop and phone.
- Element: The H1 "WCPOS Pro", the page's only H1. The title is "Pro Features & Pricing for WooCommerce POS | WCPOS" (de: "Pro-Funktionen & Preise – Kassensystem für WooCommerce | WCPOS").
- Problem: The money page's H1 is the brand name alone, with no "WooCommerce", "POS", "features" or "pricing". The category term sits only in the title and in an H2 ("What's included in Pro?"). Round 10 fixed the same gap on /downloads, so /pro is now the one main page whose H1 does not match its title. In de and nl, the localised category word ("Kassensystem", "Kassasysteem") never appears in a heading on /pro.
- Why it costs: /pro is the landing page for "woocommerce pos pro", "woocommerce pos pricing" and their localised forms. An H1 that echoes the title strengthens that match and gives answer engines a clean passage. A brand-only H1 gives the ranking nothing, and a visitor from search does not see their query confirmed.
- Fix: Make the H1 each locale's "WCPOS Pro: features & pricing for WooCommerce POS" (taken from its meta title, at most about 50 characters), or keep "WCPOS Pro" as the display line and render a short kicker above it, inside the H1, as "WooCommerce POS · Pro". Do this in every locale.
- Scope: ok. Heading copy and markup only. The price wording is not touched.

## Runner-up notes (max 3 lines)
- de: the register switches mid-page. /de and /de/pro say "du" ("Hol dir Pro", "Wähle nur…"), but the same /pro buy box then says "Testen Sie zuerst die kostenlose Version — upgraden Sie erst…" (`pro.*.tryFreeLink`/`tryFreeSuffix`), and all of `compare` (147 strings) is "Sie". Dutch is "je" throughout. Rewrite those strings in "du".
- /downloads phone, the "Unlock the full till" card: "Sign in to download →" is indented about 22 px from "View Pro plans" above it (ghost-button padding), so the two calls to action do not share a left edge.
- Home phone hero: "Try Live Demo" and "Download Free" are different widths (about 344 vs 356 px). The closing CTA band uses full-width, equal buttons, so give the hero pair the same fixed width.
