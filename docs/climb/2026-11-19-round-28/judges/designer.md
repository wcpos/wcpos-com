# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce that turns a tablet into the shop's register, selling from the same catalog, stock and prices as the online store, even offline.
Why version 2: The red "New in 2.0" line above the kicker says it on desktop and on phone: opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare/square, desktop and phone, all locales (`src/app/[locale]/(main)/compare/square/page.tsx:304-312`). The sibling comparison pages share the same pattern.
- Element: The "Which should you choose?" section has two equal cards, "Choose WCPOS if:" and "Choose Square for WooCommerce if:". Both have muted grey body text and no button or link.
- Problem: The section is where the page turns into a decision, and it is a dead end. The WCPOS card is styled exactly like the Square card: same border, same grey text, no accent. A reader who has just decided "that's me" has nothing to tap. The first call to action, the "Ready to sell in-store" band with "Try Live Demo" and "Download Free", comes after six FAQs, fourteen sources and "More comparisons". That is about 3,000 px further down on desktop and about eight screens on phone. This is the second round it has been named, and the capture is unchanged.
- Why it costs: Comparison pages bring in the highest-intent visitors on the site, people already choosing a POS. The decision moment carries no action, so the page wins the argument and then leaves readers to scroll through sources to act on it. Many will stop before they reach the CTA band.
- Fix: Under the "Choose WCPOS if:" body, add the page's existing two buttons ("Try Live Demo" primary, "Download Free" outline, with the same hrefs as the closing band). Give that card the accent border used by the selected /pro plan. Leave the Square card unchanged. Apply the same change to the shared choose block on the other comparison pages.
- Scope: ok. It reuses existing buttons, labels and links on existing pages, with no new copy or claim.

## Worst defect — UI
- Page/viewport: /support, phone (390), all locales (`src/components/support/discord-section.tsx:37`).
- Element: "Prefer to talk to a human? / Join store owners and the team in our live Discord community." It sits above a fixed `h-[600px]` WidgetBot region. The phone and desktop captures both show it as a blank grey slab.
- Problem: On phone, the only way to reach a person is a 600 px chat embed nested inside the page scroll. It is about 70% of the screen and the largest element on the page, and until WidgetBot loads it is an empty grey box. "Discord community" is plain text, and no button opens Discord in its own app or tab. The page above it is also mostly greyed out until the Turnstile box is ticked: a dim "Ask" button and low-contrast suggestion chips. The whole phone page therefore reads as disabled or broken. This is the third round it has been named, and it is unchanged.
- Why it costs: A visitor looking for a human is the one closest to giving up. On phone they get a dead block and a scroll trap where a one-tap way into Discord should be. Only the footer "Discord↗" link does that job, and few people find it.
- Fix: Add a primary "Open Discord" button under the subtitle, using the footer's existing invite (`https://discord.gg/GCEeEVpEvX`). Make the embed region `hidden md:block`, or `h-[420px] md:h-[600px]`.
- Scope: ok. This is markup and styling of one existing component, reusing an existing link, with no new claim.

## Worst defect — SEO
- Page/viewport: /compare/square, all viewports and locales (`src/lib/compare-page-json-ld.ts:12`, the glance caption and footer strings in `messages/*.json`, and `src/app/sitemap.ts:54`).
- Element: The glance caption reads "Square facts verified 2026-10-06" and the footer reads "Facts about Square verified 2026-10-06…". Sources says "read on 2026-10-06 and checked again on 2026-11-18". The `WebPage` JSON-LD gives `dateModified` `2026-10-06`, while the sitemap `lastModified` is `2026-11-18`.
- Problem: The page gives three different freshness signals. The structured data and the two visible "verified" lines say it is six weeks old. The sitemap and the page's own Sources say yesterday. Search engines read `dateModified` and visible dates to pick the snippet date, so the comparison most likely to rank for "Square vs WooCommerce POS" shows the older date. A careful reader also sees the page contradict itself. That hurts a page that sells itself as sourced and dated. This is the second round it has been named, and it is unchanged.
- Why it costs: Click-through on a comparison result depends on looking current. A stale or inconsistent snippet date loses clicks to fresher competitor pages, and the mismatch weakens the trust the page is built on.
- Fix: Set `COMPARE_FACTS_VERIFIED.square` to `2026-11-18`. Reword the caption and footer to "verified 2026-10-06, last checked 2026-11-18" in all ten locales; both dates are already stated on the page.
- Scope: ok. This changes a metadata field and existing dates on an existing page, with no new claim.

## Runner-up notes (max 3 lines)
- /compare/square phone: about 100 CSS px of empty space between the lede and "The short answer", plus about 85 px above the breadcrumb, so the short answer starts at the bottom of the fold (sixth round). The hero section's `py` is too generous below `sm`.
- Home stats band: "5,000+ Active Installations" contradicts the hero's "5,000+ Active Stores". "GPL Licensed" uses an icon where its neighbours use a number, so its label sits about 6 px off the row's baseline. "In Development Since" reads backwards; "Since 2014" already works in the hero.
- /de/pro purchase card still mixes "du" ("Hol dir Pro … Wähle nur") with "Sie" ("Testen Sie zuerst"). Use "du" throughout.
