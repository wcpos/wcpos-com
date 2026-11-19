# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source register for a WooCommerce store. It turns a tablet into the till and sells from the store's own catalog, stock and prices, even offline.
Why version 2: The red "New in 2.0" line says that opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: Home, both viewports, all locales. It is worst on phone, where each card fills a screen.
- Element: The H2 "Works for stores of all kinds" sits over three wordpress.org review cards tagged "Retail Store", "Market Vendor" and "Desktop & Offline". The third quote ends "…I believe there are more great features coming up."
- Problem: These are the only multi-sentence customer reviews on the home page, but the heading presents them as market segments. A visitor scanning the H2s never learns that real store owners are speaking. The third tag, "Desktop & Offline", is not a kind of store, so the heading's promise breaks on its own section. That card is also the weakest quote: it praises a feature and ends on "more features coming", ten days after the 2.0 launch the hero announces. This is the third round I have named it. It is unchanged (`home.useCases.title`, `messages/*.json`).
- Why it costs: Proof is what turns "free" into "trustworthy" for a shop owner. The page's best proof is labelled as something else and closes on its weakest line. The only other quote on the page ("Straightforward, functional and simple to use. 10/10.") sits unheaded under the stats band.
- Fix: Retitle `home.useCases.title` in all ten locales to say these are reviews, for example "What store owners say". Change the third tag from "Desktop & Offline" to one that matches its quote, for example "Weak internet". Both are copy changes: no new quotes, no new claims.
- Scope: ok

## Worst defect — UI
- Page/viewport: Home stats band, both viewports, on de, nl, it and pt (es and fr differ only in separator style). The text is visible in the de-home and nl-home captures, under "Kostenlos starten…" / the plan cards.
- Element: The large red figure "5,000+" over "Aktive Installationen" (de) and "Actieve installaties" (nl).
- Problem: The figure is hard-coded in `src/components/home/trust-section.tsx:7` (`{ value: '5,000+', … }`), so every locale gets the English thousands separator. The same page's hero badge is localised: "5.000+ aktive Geschäfte" and "5.000+ actieve winkels". In German and Dutch the comma is the decimal mark, so the biggest number on the page literally reads as "five point zero zero zero". It also contradicts the hero four screens up. On top of that, the label switches from stores to installations ("Geschäfte" → "Installationen", "Active Stores" → "Active Installations" in en).
- Why it costs: This is the one large figure in the trust band, set at 30–36 px in brand red. On de/nl it looks like an untranslated leftover or a mistake exactly where the page asks to be believed. Getting a localised number wrong on the proof line costs credibility with the very visitors the translations are meant to win.
- Fix: Format the value with the locale (next-intl `useFormatter().number(5000)` + "+"), or move it into `home.trust.stats` as a message per locale that matches the hero's `b1` figure. Use the hero's "stores" wording for the label so both lines say the same thing.
- Scope: ok (same figure as already published, only formatting and label consistency)

## Worst defect — SEO
- Page/viewport: /support, both viewports.
- Element: The body is the H1 "WooCommerce POS help & support", one sentence, three suggested questions rendered as buttons ("How many sites can I use my licence on?", "Which barcode scanners are supported?", "How do I sync products from WooCommerce?"), and a single H2, "Prefer to talk to a human?". Its JSON-LD is Organization only.
- Problem: The page has about 60 words of indexable copy and no in-body link to docs.wcpos.com. The three questions people actually search for exist only as chat-widget buttons, so a crawler sees neither the questions as headings nor a link to where they are answered. No other top-level page is this thin, and this is the third round it has been listed (deferred in rounds 32 and 33).
- Why it costs: "WooCommerce POS support", "WCPOS barcode scanner" and "WCPOS licence sites" are high-intent queries. This page holds the title for them but gives Google nothing to rank it on, and it passes no link equity to the docs that answer them. Visitors who would rather read than chat also have no direct path to the answer.
- Fix: Under the Aide box, add a short "Popular guides" list: the same three questions as plain `<a>` links to their existing docs pages, under an H2. Optionally add a `WebPage`/`ContactPage` JSON-LD node that names the Discord and docs URLs.
- Scope: ok (existing docs pages, no new claims, no new page)

## Runner-up notes (max 3 lines)
- The nl compare pages print English number formats in Dutch copy: "5,000+ actieve installaties, 3.7 sterren" and "meer dan 400,000 downloads" (`messages/nl.json:2058,2156,2581…`). It is the same localisation slip as the stats band.
- /downloads desktop, step 2: the link rows wrap with the separator stranded at the end of a line ("macOS (Apple Silicon) ·" / "macOS (Intel) · Windows · Linux"; Web: "Set up on your store ·"). Keep each "·" with the link that follows it, or stack the links.
- /support desktop: about 170 px of empty space sits between "Answered by Aide…" and "Prefer to talk to a human?". The hero's padding stacks on the Discord section's padding.
