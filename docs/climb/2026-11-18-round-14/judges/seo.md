# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A point of sale for WooCommerce. It turns a tablet into your shop's register, selling from the same catalog, stock and prices, and it keeps going offline. The core is free and open source, and 5,000+ stores run it.
Why version 2: The line above the eyebrow answers it: "New in 2.0 · Open and close your register, split payments and see today's sales — free."

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare/square, desktop and phone, all locales. It appears in "The short answer" (the first paragraph under the H1), in the "At a glance" row "Products and stock", and in "Which should you choose?".
- Element: "every sale is a WooCommerce order, so there is nothing to sync" and "Sells from your WooCommerce products and stock; nothing to sync".
- Problem: The home page tells the same visitor the opposite. Its H2 is "Synced with WooCommerce. Yours, even offline.", it says "Internet drops? Keep selling; WCPOS syncs when you're back online.", and /downloads says "Every till in sync". The compare page means that there is no second system to keep in step. Read literally, though, it denies the offline sync that the home page sells. A shop owner comparing the two, or a competitor quoting it, catches the contradiction on the page that ranks for "Square for WooCommerce" queries. The sceptic has named this for two rounds, and it is unchanged live.
- Why it costs: A comparison page lives on trust, and this one calls itself "honest" in its title. An internal contradiction on the headline difference weakens the whole argument. It also weakens the offline selling point that the page lists among WCPOS's strengths.
- Fix: Change "so there is nothing to sync" to "so there is no second system to keep in step". Change the glance cell to "Sells from your WooCommerce products and stock; no second catalog to sync". Change "with nothing to sync" in "Which should you choose?" to match, and change the nine locales to match.
- Scope: ok. It narrows existing copy and adds no new claim.

## Worst defect — UI
- Page/viewport: /downloads, phone (390px), in the "How it fits together" sync diagram. The source is `src/components/downloads/how-it-fits.tsx`.
- Element: the red hub "Your store / WooCommerce + WCPOS plugin" and the satellite label "Desktop".
- Problem: At phone width the hub circle overlaps the "Desktop" caption, so the text reads as "Desktop" with its lower half hidden under the red disc. The diagram also renders above its own eyebrow and H2 ("HOW IT FITS TOGETHER / One store at the centre. Every till in sync."), so the visitor meets an unlabelled diagram before the heading that explains it. Web, iOS & iPad and Android sit clear of the hub; only the top label collides. The designer has named this for two rounds, and it is unchanged.
- Why it costs: /downloads is the conversion page. A clipped label in its one explanatory graphic looks broken on the device most first visits use, right under the download button.
- Fix: On phone width, put the diagram after the eyebrow and H2 (order classes), and either increase the top satellite's radius or shrink the hub so that "Desktop" clears it. For example, give the satellite ring a larger `min-height`/offset below `sm`.
- Scope: ok. It is one component's layout, with no copy changes.

## Worst defect — SEO
- Page/viewport: `/sitemap.xml`, all ten locales. The source is `src/app/sitemap.ts:47-60` (`CONTENT_UPDATED_AT`, "checked 2026-10-07"). The file is unchanged on `main` at `5f768b8`.
- Element: `'/': '2026-10-07'`, `'/pro': '2026-10-07'`, `'/extensions': '2026-10-07'`, `'/compare': '2026-10-07'`, `'/compare/square': '2026-10-06'`. `/compare/foosales` has no entry, so it emits no `lastmod` at all.
- Problem: The dates are still six weeks old. Since they were set, the home page was rewritten for 2.0 and changed again this round (#760, #761). /pro gained a new H1, `FAQPage` JSON-LD and the display card (#751, #756, #757). /extensions was reordered (#755). The /compare hub changed in #752, and every /compare/* page gained Pro and extension links (#759). /compare/square's own footer dates its facts to WCPOS 2.0 (2026-11-09), yet its `lastmod` says 2026-10-06. The file asks for a date bump with every content change, and none of the last twelve fix PRs did one. This is the fourth round it has been named, and it was a listed round-14 candidate.
- Why it costs: Google trusts `lastmod` only while it is consistently accurate. Every money page now advertises a date older than content plainly on the page, which teaches Google to ignore this sitemap's `lastmod`. That removes the cheapest recrawl signal for the 2.0 titles, the new /pro FAQ rich result and the refreshed "(2026)" comparison pages.
- Fix: Set each `CONTENT_UPDATED_AT` entry to its route's last content commit, which is 2026-11-18 for `/`, `/pro`, `/extensions`, `/compare` and every `/compare/*` touched by #759, and add `/compare/foosales`. Add a test that fails when a `/compare/*` page directory has no entry.
- Scope: ok. It is a metadata field.

## Runner-up notes (max 3 lines)
- The home `SoftwareApplication` JSON-LD (`src/lib/software-application-json-ld.ts`) has no `description` or `softwareVersion`. Adding `softwareVersion` from the 2.0.4 release the /downloads page already shows would tie the structured data to 2.0.
- The /compare hub's seven links all use the same anchor text, "Read the comparison". The card H2s ("WCPOS vs Square for WooCommerce") are not links, which wastes the best anchors for the comparison pages.
- /support's H1 "How can we help?" carries no query terms, so the page competes for "WooCommerce POS support" only through its title.
