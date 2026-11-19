# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale that turns the tablet, phone or computer you already have into a register for your WooCommerce store, with the same catalog, stock and prices, even offline.
Why version 2: The small "New in 2.0" line above the kicker says that opening and closing the register, split payments and today's sales are now free. It reads as a footnote, not as news.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: home (all locales), desktop and phone, top of the hero (the scroll-story's first act, `story-copy-blocks.tsx:73-90`)
- Element: "New in 2.0 · Open and close your register, split payments and see today's sales — free."
- Problem: The one line that answers "why version 2" is styled as body text. It is `text-sm`, dark brown ink set straight on the wood photo, with no container and no link. It sits directly above a second eyebrow, the spaced red caps "POINT OF SALE FOR WOOCOMMERCE", so the H1 has two eyebrows stacked on top of it. The red "New in 2.0" and the red kicker compete for the same job. On phone the line runs to two lines in en and three in de ("…die heutigen Verkäufe – / kostenlos."), and it pushes the H1 down without looking like an announcement. It is also a dead end: a visitor who wants to know what else 2.0 changed has nothing to click.
- Why it costs: This is a release month, and returning 1.x users and new visitors both arrive asking "what's new". The answer is the lowest-contrast, least-styled text in the fold, so skimmers read straight past it. Two judges said so last round. The conventional cue for news, a small pill that links to the release notes, is missing, and so is the path to the changelog that would make the 2.0 story credible.
- Fix: Render the v2 line as a compact pill (a rounded border with a light wash behind it, `text-sm`, the red "New in 2.0" label kept) that links to the existing 2.0 release notes (the /downloads "What's new" section or the changelog). Keep the copy unchanged. On phone, let the pill carry the label plus a shortened text, or keep the full text and let it wrap inside the pill, so it reads as one unit.
- Scope: ok (styling and a link to an existing page; same copy, no new claims). This touches the scroll-story component, so check it against the owner's open scroll-story PR before branching.

## Worst defect — UI
- Page/viewport: /downloads, phone (390 px), "Pick your device" step, the Desktop app and Web cards (`downloads/page.tsx:298-318`)
- Element: "macOS (Apple Silicon) · / macOS (Intel) · Windows · Linux" and "Set up on your store · / Open the live demo"
- Problem: The dot separators are inline spans in a `flex-wrap` row, and in the Desktop card each dot is glued to the link before it. At phone width the rows break after the dot, so a line ends on a stray "·" and the next line starts flush left. In the Web card the dot is its own flex item, so it hangs alone at the end of the first line. The result is ragged, typographically broken link lists in the two cards a downloader is most likely to tap. The Desktop card has four links of uneven length, so one of them also ends up stranded.
- Why it costs: /downloads is the highest-intent page on the site, and this step is where the visitor picks a build. Orphaned separators make the page look unfinished just before a download. The links are 16 px text targets in a run-on line, so they are also harder to tap than they need to be.
- Fix: Drop the "·" spans and render each card's links as a simple stacked list on phone (`flex-col gap-1`, with the inline dots kept from `sm:` up), or use a CSS separator (`[&>*+*]:before:content-['·']`) that never ends a line.
- Scope: ok (one component's markup and styling; no copy change)

## Worst defect — SEO
- Page/viewport: home meta description (en, plus nl and de, which mirror it). This is the search snippet, the same at every viewport.
- Element: "Free, open-source WooCommerce POS. Sell offline, split payments, open and close the register, free in 2.0. Web and desktop apps; iOS and Android in beta." (`messages/en.json:58`; nl "Verkoop offline…", de "Verkaufe offline…")
- Problem: The site's own snippet leads its feature list with an unqualified "Sell offline". In 2.0 only cash and Card-tender sales complete offline, and integrated readers and gateways need a connection. The home and /compare pages already qualify this. The snippet is also hard to parse: "free in 2.0" trails at the end of a comma list, so it reads as if offline selling itself is new in 2.0. And the description never says what the product does (it turns a tablet, phone or computer into a register), which is the hero's clearest line.
- Why it costs: The snippet is the first thing a searcher reads, often the only thing. An overclaim there is what a competitor or reviewer quotes back. A list that doesn't parse also loses the click to a result that says plainly what it is. The issue repeats in all eleven locales.
- Fix: Rewrite `home.meta.description` in about 155 characters to lead with what WCPOS does and to scope offline, for example: "Free, open-source WooCommerce POS for web and desktop (iOS, Android in beta). Cash sales work offline. New, free in 2.0: register open/close, split payments." Apply the same structure in every locale.
- Scope: ok (metadata text only; it uses the approved offline fact, with no new claims and nothing about pricing)

## Runner-up notes (max 3 lines)
- /support H1 is still off the type scale (`text-3xl md:text-4xl`, looser tracking than the 48 px tight H1s on /pro and /compare). On phone it breaks as "…help / & support", starting a line with "&". This is the fourth round it has been named.
- /downloads mobile Lighthouse fell to 69 (TBT 1,070 ms, bootup 2.0 s, forced-reflow flagged); home mobile also fell, to 78, so this is partly capture noise. The forced reflow on /downloads (platform detection?) is worth one look.
- de home kicker is still English, "POINT OF SALE FÜR WOOCOMMERCE", directly under the German v2 line. It should read "Kassensystem für WooCommerce", the term the de title and H2s already use.
