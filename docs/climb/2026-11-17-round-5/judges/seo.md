# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: a free, open-source point of sale for WooCommerce that turns a tablet into a register, using the same catalog, stock and prices as the online store.
Why version 2: the "New in 2.0" line says you can now open and close the register, split payments and see today's sales, all for free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare/square, and the other six /compare/* pages, which share the same structure. Desktop and phone.
- Element: the page ends with "Which should you choose?", then the FAQ, then the fine print "Facts about Square verified 2026-10-06 … Spot an error? Email support@wcpos.com — we correct fast and log every change.", and then goes straight to the footer.
- Problem: These pages get the highest-intent visitors on the site: a shop owner searching "WCPOS vs Square" is deciding which to use. The page wins the argument ("Choose WCPOS if: …") and then offers no next step. The only in-body link to the product is a bare `demo.wcpos.com/pos` in the cost section, halfway down. There is no "Download free", no "Try the live demo" button and no link to /pro after the verdict. Home and /downloads both end with a CTA block; the comparison pages are the exception. This was a round-4 candidate (shop-owner and designer) and it is still there.
- Why it costs: A visitor who has just read "Choose WCPOS if …" has to scroll back up to the nav or hunt through the footer to act, so many of them bounce back to the search results. That bounce is the worst outcome for a page that exists to convert comparison searches.
- Fix: Add the home page's closing CTA block ("Try Live Demo" and "Download Free", plus a "See Pro features" text link) after "Which should you choose?" or after the FAQ, through the shared comparison layout, so all seven pages get it. Reuse the existing copy keys.
- Scope: ok

## Worst defect — UI
- Page/viewport: /compare/square at phone width (390×844). /compare/jovvie, /oliver-pos, /vitepos, /yith-pos, /foosales and /woocommerce-pos look the same.
- Element: the hero (`<Section spacing="hero">` at `compare/square/page.tsx:187`), which holds the H1 "WCPOS vs Square for WooCommerce" and a centred grey intro of six lines, followed by the disclosure card "Who runs this comparison".
- Problem: #722 removed the doubled padding between the hero and the disclosure card on the /compare hub, but the comparison pages kept the full `hero` spacing. On phone, that leaves about 170 px of empty dark space under the header and another band of about 170 px between the intro and the disclosure card. The whole first screen is the H1, the intro and half of the disclosure card. "The short answer", which is what the visitor came for, starts on the third screen.
- Why it costs: A phone visitor from search sees a wall of preamble and no answer, so the page feels slow even though it loads fast. The Lighthouse mobile numbers hide this.
- Fix: Apply #722's change to each comparison page's hero and disclosure sections (`className="pb-6 md:pb-10 lg:pb-12"` on the hero, `pt-0` on the disclosure section), or do it once in a shared wrapper.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /downloads, all ten locales, desktop and phone.
- Element: `<h1>One till, every device.</h1>` (`messages/en.json:1625`, `downloads.hero.title`), under `<title>Download WooCommerce POS for Mac, Windows, Linux & Web | WCPOS</title>`. The "DOWNLOADS" eyebrow above the H1 is a `<p>`.
- Problem: #723 gave this page `SoftwareApplication` JSON-LD, and #714 fixed its title, but the only H1 on the page still contains no "download", "WooCommerce", "POS" or platform name. "Till" is a British word, while US shop owners search "register" or "POS". None of the H2s carry a query term either ("One store at the centre. Every till in sync.", "Three steps to your first sale", "What's new"). It is now the only money page whose H1 says nothing about the product. Home, /pro, /compare and /extensions all name WooCommerce or POS in the title and heading.
- Why it costs: This page should rank for "WooCommerce POS app", "download WooCommerce POS" and "WooCommerce POS for Windows/Mac". The title and the H1 disagree, so Google may rewrite the snippet from the H1 to "One till, every device. | WCPOS", which loses the click to a competitor whose snippet names the platform.
- Fix: Change `downloads.hero.title` in all ten locales to something like "Download WooCommerce POS for every device". Keep "One till, every device." as the eyebrow or subtitle, and update the H1 assertion in `downloads/page.test.tsx`.
- Scope: ok

## Runner-up notes (max 3 lines)
- The home meta description says "… all free in WCPOS 2.0. Desktop, web and mobile apps." In a search snippet, that reads as if the 2.0 phone apps are out, and they are not. Something like "Desktop and web apps; iOS and Android in beta" would be accurate.
- No page body links to /compare, including the home page (it is linked only from the footer), although home is the strongest page. One "How WCPOS compares →" link near the Free/Pro block would pass authority to the competitor-query pages.
- /pro shows a visible FAQ with no `FAQPage` JSON-LD, while /compare/* has it. `SoftwareApplication.url` is hard-coded to `https://wcpos.com` on the localized home and downloads pages; it should use `localeUrl`.
