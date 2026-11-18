# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce that turns a tablet into a register using the store's own catalog, stock and prices, even offline.
Why version 2: The "New in 2.0" line says opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: home (`/`), desktop and phone, page body.
- Element: The home body has no link to `/compare`. The only paths to it are the footer "PRODUCT → Compare" link and nothing in the header nav. The page's last two sections are "Start free. Upgrade when you need more." and "Ready to sell in-store with WooCommerce?", and they offer only "See Full Pricing & Features", "Try Live Demo" and "Download Free".
- Problem: A shop owner who has reached the bottom of the home page and is still undecided is weighing WCPOS against Square, WooCommerce's official POS, Oliver and the rest. The site has an honest, sourced comparison hub with seven detail pages for exactly that moment, but the home page never offers it. The same hub gets only a footer link, so it receives the weakest internal-link signal on the site.
- Why it costs: Visitors who are comparing leave to search "WCPOS vs Square" and land on affiliate roundups instead of the site's own sourced page. Search engines see `/compare`, the page aimed at "WooCommerce POS comparison" and "best WooCommerce POS" queries, linked only from the footer and never in context from the strongest page on the domain.
- Fix: Add one secondary text link under the "Ready to sell in-store with WooCommerce?" CTA (or under the Free/Pro cards), such as "Comparing options? See how WCPOS compares →", pointing to `/compare`. Reuse the existing footer label string for every locale.
- Scope: ok

## Worst defect — UI
- Page/viewport: `/pro` on phone (390 px), all locales. Checked in `pro-phone-fold.jpg` and `de-pro-phone-fold.jpg`.
- Element: Right after the H1 "WCPOS Pro" and its subtitle, the buy box "Get Pro / Yearly · Most Popular · $129 USD/yr" ("Hol dir Pro / Jährlich · Am beliebtesten · 129 $") fills the rest of the first screen. "What's included in Pro?" and the feature list, which opens with "More Registers & Multiple Stores", only start below the whole buy box.
- Problem: On desktop the features and the buy box sit side by side. When the columns stack on phone, the price goes first, so a phone visitor sees a price before anything it pays for. Round 7 moved "More registers & multiple stores" to the top of the list, and on phone that line is now a full scroll below the price.
- Why it costs: Most visits to the money page arrive on phone from the home Pro card. Showing the price before the value makes the page read as a checkout rather than an explanation, and it hides the round-7 fix on the device most visitors use.
- Fix: In the /pro layout, give the feature column the earlier order at the base breakpoint (for example `order-1` on the features and `order-2` on the buy box, then `lg:order-none`). This changes only the stacking order. No price copy or format changes.
- Scope: ok. The order changes, but the price wording does not.

## Worst defect — SEO
- Page/viewport: `/downloads`, all ten locales, desktop and phone.
- Element: `<h1>One till, every device.</h1>` (`messages/en.json:1631`, `downloads.hero.title`). The H2s also lack search terms: "One store at the centre. Every till in sync.", "Three steps to your first sale" and "What's new". The "DOWNLOADS" eyebrow above the H1 is a `<p>`.
- Problem: This defect has been open for four rounds (round-5/6/7 backlogs: "a keyword in the /downloads H1"). The title ("Download WooCommerce POS for Mac, Windows, Linux & Web") and the SoftwareApplication JSON-LD now target download queries. The only H1, though, says nothing about downloading, WooCommerce, POS or any platform. It also uses "till", a British word, on a site that says "register" everywhere else, including the home page ("turns the tablet into your register"). Every other money page names WooCommerce or POS in its H1: home, /compare, /extensions and the compare detail pages.
- Why it costs: The H1 is the strongest on-page signal after the title. When the H1 and title disagree, Google is more likely to rewrite the title in results. US shop owners searching "WooCommerce POS app download" or "WooCommerce POS for Mac" get no heading-level confirmation that this page matches their search. "Till" also reads as foreign copy to the largest English-speaking market.
- Fix: Change `downloads.hero.title` to something like "Download WCPOS for every device." or "The WooCommerce POS app for every device." in en, and give each locale the equivalent (de "Kasse", nl "kassa" and so on, which already avoid "till"). Optionally change "Every till in sync." to "Every register in sync."
- Scope: ok

## Runner-up notes (max 3 lines)
- The `/pro` meta description ("Upgrade WCPOS with Pro: terminal payments, stock and price editing…") lacks "WooCommerce" and the lead feature, more registers and multiple stores. The title does carry "WooCommerce POS".
- `/support` has the only brand-only title, "Support | WCPOS", with no "WooCommerce POS". The home and /downloads SoftwareApplication JSON-LD has no `description` field.
- On the `/downloads` phone picker, the iOS & iPad and Android tiles carry no "Beta" tag, while the home device row says "iOS Beta" and "Android Beta".
