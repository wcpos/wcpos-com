# Judge: designer (product designer)

## 10-second test
What is WCPOS: A point of sale for WooCommerce that turns a tablet into your register, selling from the same catalog, stock and prices, even offline.
Why version 2: 2.0 adds opening and closing the register, split payments and today's sales, all free. The red "New in 2.0" line above the kicker says so at both widths.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /de/pro, phone and desktop. This is the buy box directly under "Loslegen" and the "Einmalzahlung" line.
- Element: "Testen Sie zuerst die kostenlose Version — upgraden Sie erst, wenn sie sich bewährt hat" (`messages/de.json` lines 482–483, `tryFreeLink` + `tryFreeSuffix`).
- Problem: The rest of /de and /de/pro addresses the reader as "du": "Hol dir Pro", "Wähle nur, wie lange du Updates möchtest", "Stell einen Bildschirm vor deine Kundschaft". The one reassurance line in the buy box switches to formal "Sie". This is the third round I have named it, and the phone capture shows it unchanged.
- Why it costs: A register switch inside one card reads to a German visitor as stitched-together machine translation. It lands at the point of purchase, on the line whose job is to lower the risk of buying. It undermines the care the rest of the German copy shows, right where the visitor decides.
- Fix: Rewrite both keys in "du", e.g. "Teste zuerst die kostenlose Version" + " — und steig erst um, wenn sie sich bewährt hat". Then grep the `pro` and `home` namespaces of de.json for any other "Sie/Ihr" address.
- Scope: ok. Two copy keys in one locale. This is not price or plan-term wording, and it makes no new claim.

## Worst defect — UI
- Page/viewport: /downloads, phone 390 (every locale). This is the sync diagram after the download card.
- Element: The red "Your store · WooCommerce · + WCPOS plugin" hub and the "Desktop" node above it (`src/components/downloads/sync-diagram.tsx`, `SIZE = 440`, `ORBIT_RADIUS = 138`).
- Problem: At phone width the hub's red disc covers the lower half of the "Desktop" label, and the Android node nearly touches the hub. The orbit shrinks with the container (it is laid out in % of a 440-unit box), but the hub (~112 px) and the nodes stay fixed in size, so on a narrow screen they close in on each other. The diagram also renders above its own "HOW IT FITS TOGETHER / One store at the centre. Every till in sync." heading (`how-it-fits.tsx`, a single-column grid below `lg`), so it floats unlabelled after a ~200 px empty band. Desktop at 1440 is clean. I named this last round, and it is still live.
- Why it costs: /downloads is the page where a visitor commits to install, and most visitors arrive on a phone. The only illustration that explains the architecture shows a label clipped by a shape, which reads as unfinished craft on a page meant to make the product feel dependable.
- Fix: Scale the hub and nodes with the container (size them in % of `SIZE`, or `scale()` the whole diagram from its measured width), or raise `ORBIT_RADIUS` below `sm`. Give the diagram column `order-last lg:order-none` so the eyebrow and H2 come first on phone.
- Scope: ok. Styling in one component plus one class in `how-it-fits.tsx`, with no copy change.

## Worst defect — SEO
- Page/viewport: all seven /compare/* pages (e.g. /compare/square, "Pricing" section), every locale.
- Element: "Pro adds: multi-store management, more registers, card-terminal integrations, … and the extension directory." (`square.pricing.proAdds` and its siblings in `messages/*.json`). It is plain text. The paragraph after it links only to demo.wcpos.com.
- Problem: The comparison pages are the site's highest-intent organic landing pages ("WCPOS vs Square"), and each one lists thirteen Pro features without a contextual link to /pro, or to /extensions for "the extension directory" and the terminal list. The only internal routes onward are the header and footer navigation, so these pages pass no in-body link equity or anchor relevance to the money page.
- Why it costs: Searchers who arrive comparing systems hit a dead end at the exact moment they read what Pro adds. Google also gets no contextual signal tying "WooCommerce POS card terminals / multi-store" anchors to /pro and /extensions. Both pages rank and convert less well than they would with seven relevant inbound body links.
- Fix: Link "Pro" in each `proAdds` sentence to /pro (locale-aware) and "the extension directory" to /extensions, through a rich-text `t.rich` tag in the seven page components.
- Scope: ok. Markup and existing copy only, with no wording change to prices or plan terms.

## Runner-up notes (max 3 lines)
- The orphaned Pro badge is still live: nl home phone "Voorraad en prijzen direct aanpassen" drops "Pro" onto its own indented line. Bind the badge to the last word (`whitespace-nowrap` on the last word plus badge).
- The /compare hub has seven identical "Read the comparison" anchors, and the card headings are not links. Make the heading the link, or add the vendor name to the anchor.
- nl/de home phone sync illustration: the floating chips "bestellingen → Woo ●" and "Bestellungen → Woo ●" are cut off at the right screen edge, and "1.204 producten" sits flush against the left edge. Inset the chips 16 px below `sm`.
