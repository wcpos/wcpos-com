# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source register for a WooCommerce store. It turns a tablet into the till and sells from the shop's own catalog, stock and prices, even offline.
Why version 2: The red "New in 2.0" line over the eyebrow says that opening and closing the register, split payments and today's sales are now free. It is answered, though it is still the smallest type on the desktop fold.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare/square, phone (desktop has the same order, but there it costs less)
- Element: The page opens with the H1 "WCPOS vs Square for WooCommerce", then "The short answer", "Who runs this comparison", "At a glance" (a nine-row table), "One system or two?", "How do card payments work?" and "What does it cost?". The first button ("Try Live Demo" / "Download Free" in the "Choose WCPOS if:" card) only comes under "Which should you choose?".
- Problem: The phone page is about 13,700 px tall, and the first button sits about 60% of the way down, roughly 8,000 px or nine and a half screens. Before that, the only way to act is the plain inline text "Try everything first at demo.wcpos.com/pos (login demo / demo)", at about the halfway point. "The short answer" makes the WCPOS case in full and then stops, with nothing to click.
- Why it costs: People who search "WCPOS vs Square" are the closest to deciding of anyone who reaches the site. Most phone readers make up their mind at the short answer and never get to the decision card. The page has persuaded them but gives them nothing to do. The home page and /pro both put a button inside the first screen or two.
- Fix: Render the existing `<CompareChooseActions />` (the same Try Live Demo / Download Free pair) directly under the "The short answer" section in `src/app/[locale]/(main)/compare/square/page.tsx`. Do the same on the four sibling comparison pages, which use the same template. This needs no new copy or keys.
- Scope: ok

## Worst defect — UI
- Page/viewport: /downloads, phone 390×844 (en, and longer in de/nl)
- Element: The red full-width "Download for macOS" button (or the button for whichever platform is detected), under "Install the free plugin".
- Problem: The page has one job, and its main button is not on the first screen. Above the button, the phone hero stacks:
  - about 80 px of empty band (`spacing="hero"`, `py-20`);
  - a "DOWNLOADS" eyebrow that repeats the H1 and the active nav item;
  - a two-line H1 and a tagline, then `mt-10`;
  - two rows of 96 px-wide platform tiles with `py-4`;
  - a card with `p-8` padding.

  So the red button starts at about 790 px. On a first visit that is under the consent banner, which starts at about 750 px. The fold ends on the outline "Install the free plugin" button. /pro already fixed the same problem with tighter phone padding (#826), so /downloads, /support and /extensions are now the pages that don't match.
- Why it costs: A phone visitor who tapped "Download Free" on the home page arrives and sees six tiles and a secondary button, but no download. It looks as if they still have to choose before anything happens, though the platform is already detected. Every extra scroll on a download page loses people.
- Fix: In `src/components/downloads/download-hero.tsx`, on phone only:
  - use /pro's hero padding pattern (`pt-10 … sm:pt-20`) in place of `spacing="hero"`;
  - drop the eyebrow below `sm` (`hidden sm:block`);
  - make the tiles shorter (`py-2.5`, `mt-6` for the tile group);
  - change the card to `p-6 sm:p-8`.

  Together these move the red button up by about 150 px, so it sits clear of the banner. Desktop stays unchanged.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /de/pro (also /fr/pro and /pt/pro), meta description, both viewports
- Element: "WCPOS Pro für WooCommerce: weitere Kassen und mehrere Filialen, Terminalzahlungen, Lager- und Preisbearbeitung, Bestell- und Kundenverwaltung." (142 characters)
- Problem: The en, nl, es and it /pro descriptions all end on reports: "and full reports", "en volledige rapporten", "e informes completos" and "e report completi". The de, fr and pt ones (142, 160 and 138 characters) leave reports out. German has 18 spare characters. Reports are the Pro feature that 2.0 sharpens: today's report is free, and other days, registers and stores are Pro. The German H1 subtitle on the same page even says "vollständige Berichte", so the snippet and the page disagree.
- Why it costs: The /pro snippet is where a searcher compares Free with Pro. In three of the ten locales, including German, one of the site's two long-word target markets, the snippet hides one of the main reasons to upgrade. This also leaves a parity gap that the round-29 de/fr/pt home fix closed for the home page.
- Fix: In `messages/de.json`, end the description "…Bestell- und Kundenverwaltung, Berichte." (about 152 characters). Make the same change in pt ("…, relatórios completos.", ≤160) and in fr (shorten "modification du stock, des prix…" to fit "rapports"). The existing 160-character test still applies.
- Scope: ok

## Runner-up notes (max 3 lines)
- Home, phone: the three review cards each open with a 112 px pastel band (`h-28`) that holds one 40 px icon. That adds about 340 px of decoration before the quotes, the site's only real proof. Use `h-14` or `hidden md:flex` below `md`. Also, "Desktop & Offline" is not a kind of store, under a heading that says "Works for stores of all kinds".
- Home: the hero says "5,000+ Active Stores", but the stats band lower down says "5,000+ Active Installations". The same proof number has two labels; pick one.
- Home phone: the trust row wraps as "• 5,000+ Active Stores • Free & Open Source" and then "• Since 2014" alone on a line (de: "Seit 2014"). Balance it, or stack it 2+1 deliberately.
