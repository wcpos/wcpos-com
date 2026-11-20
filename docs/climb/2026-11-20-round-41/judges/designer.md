# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale that turns your tablet, phone or computer into a register for your WooCommerce store, selling from the same catalog, stock and prices, even offline.
Why version 2: The red "New in 2.0" line above the kicker says you can now open and close the register, split payments and see today's sales for free. It is legible but still set as a caption, not as news.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare/square, desktop and phone, the "Which should you choose?" section (`text/compare-square.txt:86-95`, `messages/en.json` `compare.square.choose.wcpos.body`). The same pattern appears on all seven comparison pages.
- Element: "Choose WCPOS if: You want every sale, online and in person, to be a WooCommerce order sold from one catalog, with no second catalog to keep in sync, run more than one store, sell outside Square's eight countries, want a register in a web browser or in desktop apps for Windows, macOS and Linux, or want to use a payment gateway or card terminal other than Square."
- Problem: The page's decision point is a single 60-word sentence that chains five unrelated conditions with commas. It joins them with "or", while the Square block beside it joins its conditions with "and". "No second catalog to keep in sync" repeats "sold from one catalog" in the same clause. It sits directly above the page's only mid-page CTA pair ("Try Live Demo" / "Download Free"), so the reader reaches the buttons before the reasons are clear.
- Why it costs: This is the paragraph a shop owner on a comparison page is looking for. A list of five short conditions can be scanned in about two seconds, and each matching line is a reason to click "Try Live Demo". As one run-on it reads as fine print, and the reader skips to the FAQ. I have named this as a runner-up for five rounds and it is still open.
- Fix: Render each "Choose X if" body as a short bullet list, with an optional `items` array beside `body` in the choose component. For Square: "Every sale, online and in person, should be a WooCommerce order from one catalog" · "You run more than one store" · "You sell outside Square's eight countries" · "You want a register in a browser or desktop apps for Windows, macOS and Linux" · "You want a gateway or card terminal other than Square". Do /compare/square in all locales first, then the other six pages.
- Scope: ok. The change is markup plus a re-split of existing wording, with no new claims, numbers or price wording.

## Worst defect — UI
- Page/viewport: /support, desktop and phone, the hero H1 (`src/components/support/support-chat.tsx:178`, and the same classes at `:350`)
- Element: "WooCommerce POS help & support"
- Problem: This is the only marketing page whose H1 is not on the hero type scale. It is `text-3xl font-bold md:text-4xl` (36 px, normal tracking). /pro, /extensions, /compare and /downloads use `SectionHeading size="hero"` or the same classes: `text-4xl font-bold leading-tight tracking-tight md:text-5xl` (48 px, tight). At 1440 px the support title is visibly smaller and looser than every other page title in the nav. At 390 px it breaks as "WooCommerce POS help / & support", which leaves a two-word orphan that starts with an ampersand. Its subtitle is `text-base` against the `text-lg` / `text-xl` subtitles elsewhere.
- Why it costs: When a visitor moves Downloads → Pro → Support through the header, the page title shrinks and changes tracking. That makes /support read as a different template, which weakens trust on the page people reach when something is already wrong. The phone orphan is the first thing a visitor sees on that page.
- Fix: Swap both H1s to the shared hero classes (`text-4xl font-bold leading-tight tracking-tight text-balance md:text-5xl`) and the subtitle to `text-lg md:text-xl`. Alternatively, use `SectionHeading as="h1" size="hero"`.
- Scope: ok. The change is class strings in one component, with no copy change.

## Worst defect — SEO
- Page/viewport: /de home, every viewport: the first H2 (`messages/de.json:284`) and the meta description (`messages/de.json:58`). The term also appears in the /de/pro `<title>` (`messages/de.json:411`).
- Element: "Ein POS. Web, Desktop, iOS & Android." · "Kostenlose Open-Source-WooCommerce-Kasse für Tablet…" · "Pro-Funktionen & Preise – Kasse für WooCommerce | WCPOS"
- Problem: The de title, kicker and /de/pro H1 all say "Kassensystem". The home's most prominent H2 keeps the English "POS", though, and the home meta and the /de/pro title say "Kasse", so the head term is split three ways across the two pages that matter most. nl is consistent ("Eén kassasysteem.", "Kassasysteem voor WooCommerce"). This was named last round and is still unchanged.
- Why it costs: German searchers use "WooCommerce Kassensystem". The snippet and the first heading below the H1 both miss the term the title targets. On /de/pro, the title ("Kasse") and the H1 ("Kassensystem") disagree on the same page. To a German reader, "Ein POS" also reads like an untranslated string.
- Fix: Make three de strings use "Kassensystem":
  - `home.story.a2.h` → "Ein Kassensystem. Web, Desktop, iOS & Android."
  - `home.meta.description` → "Kostenloses Open-Source-Kassensystem für WooCommerce auf Tablet, Telefon oder Computer…", kept at 160 characters or fewer.
  - `pro.meta.title` → "Pro-Funktionen & Preise – Kassensystem für WooCommerce".
- Scope: ok. The change is de message strings only, with no claims added. The H2 is rendered by the scroll-story, but the edit is to the message file only.

## Runner-up notes (max 3 lines)
- /compare/square on phone: "The short answer" is two unlabelled paragraphs of about 90 words each (about 22 lines at 390 px) before the CTA. Lead each one with a bold "WCPOS:" / "Square for WooCommerce:".
- Since #877's `text-balance`, the home H1 on nl/de phones breaks "Je WooCommerce- / winkel, aan / de toonbank." and "…- / Shop an / der Ladentheke.", with a short middle line in a diamond shape. Try `sm:text-balance` or `text-pretty` below `sm`.
- /compare/square meta description still lists topics ("where sales are recorded, syncing, locations and fees") instead of stating the answer the hub card now gives.
