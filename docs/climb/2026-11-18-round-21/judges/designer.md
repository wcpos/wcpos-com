# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce. It turns a tablet into the shop's register and sells from the same catalog, stock and prices as the online store, even offline.
Why version 2: The red "New in 2.0" line above the kicker says it on desktop and phone, in en and nl: in 2.0, opening and closing the register, split payments and today's sales are free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /downloads, step 3 "Want more? Go Pro" and the page tagline. Desktop and phone, en (the other locales use the same keys).
- Element: "A licensed plugin that adds terminal payments, refunds and stock control on the same foundation." / card title "Unlock the full till" (`messages/en.json:1714-1715`). There is also the tagline under the H1, "One till, every device." (`:1639`), and "Every till in sync." (`:1649`).
- Problem: This is the Pro pitch at the point of download. Its lead sentence leaves out the 2.0 upsell, which is more registers and more stores. The 2.0.0 notes open just below it and say "Free includes one register; more registers need Pro", and /pro leads with "More Registers & Multiple Stores". "Till" appears four times on a page whose own 2.0 notes, and the rest of the site, say "register". A shop owner arriving from the home page's "Open and close your register" line meets a different word for the same thing.
- Why it costs: The one Pro nudge on the highest-intent page sells the smaller features. The till/register switch makes the 2.0 story read as if two teams wrote it. The seo judge raised this last round, and it is still unchanged.
- Fix: Body: "A licensed plugin that adds more registers and stores, terminal payments and stock control on the same foundation." Card title: "Unlock the full register". Tagline: "One register, every device." Then "Every register in sync." Apply the same wording to the locale keys.
- Scope: ok. This is copy only. It uses features /pro already lists and does not change pricing or terms.

## Worst defect — UI
- Page/viewport: /extensions, phone (390). Ten cards are affected: Mercado Pago, Mollie, PayArc, PayPal Reader, Square, Stripe, SumUp, Windcave, Email Invoice Gateway and WCPOS Vipps MobilePay. On desktop, the Windcave and Mercado Pago cards are affected.
- Element: The "Pro" chip after titles such as "Square Terminal for WooCommerce" and "PayPal Reader for WooCommerce".
- Problem: The chip is an inline sibling of an inline `<h3>` with `ml-2` (`src/app/[locale]/(main)/extensions/page.tsx:112-122`). When the title fills its line, the chip drops onto a line of its own and keeps the 8 px left indent. On phone, the payments group becomes a column of stray chips, each sitting slightly in from the title edge. #761 fixed the same pattern in `FeatureCard`, but this page renders its own titles. This is the sixth round I have named it, and the capture is unchanged.
- Why it costs: /extensions is where card-terminal searches land, and these are the paid add-ons. Orphaned chips that are slightly off the grid make the page look unfinished. A chip on its own line also reads as a loose tag rather than as "this one needs Pro".
- Fix: Make the wrapper `flex flex-col items-start gap-1` (or give the badge `block w-fit mt-1`) and drop `ml-2`, so the chip always sits on its own line, flush left. Alternatively, wrap the title's last word and the badge in a single `whitespace-nowrap` span, as #761 did.
- Scope: ok. This is styling in one page component.

## Worst defect — SEO
- Page/viewport: /compare/square, and every other /compare/* page, in all locales. The defect is in the JSON-LD.
- Element: The visible "Square facts verified 2026-10-06 …" line, the title "WCPOS vs Square for WooCommerce (2026)", and JSON-LD that has only `FAQPage` and `BreadcrumbList` (`src/app/[locale]/(main)/compare/square/page.tsx:90-115`).
- Problem: The pages are built to look dated and maintained. They show a verified date, say "We re-verify every quarter", and put the year in the title. The structured data carries none of that: there is no `Article`/`WebPage` node with `datePublished`, `dateModified` or an author/publisher. The date that sets these pages apart from competitor listicles is invisible to search engines.
- Why it costs: Comparison queries ("WCPOS vs Square") reward fresh, attributed content. Without a machine-readable date, the snippet can't show one, and the quarterly re-verify does nothing for ranking. The shop-owner judge has also raised this twice.
- Fix: Add one `Article` (or `WebPage`) node per compare page, using the existing verified date as `dateModified`, the publish date as `datePublished`, `author`/`publisher` set to the WCPOS Organization, and `headline` set to the H1. A shared helper can feed all seven pages.
- Scope: ok. These are metadata fields drawn from dates the pages already show.

## Runner-up notes (max 3 lines)
- /pro desktop: in the Yearly radio card, "Updates & support for 1 year" wraps to leave "year" alone on the second line, because the price column squeezes it. Layout only, but it sits next to pricing, so it should go through the front desk.
- /support phone: the H1 still breaks before "& support", the placeholder is still clipped at "receipt printe", and the Ask button and chips still look disabled while Turnstile loads.
- /downloads "What's new": 2.0.0 now opens (good), but its first two paragraphs are bold warnings ("cashiers will need time…", "Sync every till before upgrading") ahead of the feature list. A normal weight for the warnings, or a callout style, would let the features lead.
