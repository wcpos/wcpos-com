# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce. It turns a tablet into a register that sells from your store's own catalog, stock and prices, and keeps working offline.
Why version 2: Version 2 adds opening and closing the register, split payments and today's sales report, all free ("New in 2.0 · … — free.").

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /extensions, desktop and phone, all locales.
- Element: 12 of the 15 cards carry a red "Pro" badge ("Mercado Pago Terminal for WooCommercePro", "Stripe Terminal for WooCommercePro" …). The intro reads "Add card terminals, payment gateways, stock and coupon integrations, and multilingual catalogs to WCPOS. Each one links to its documentation." The body never says what the badge means and never links to /pro.
- Problem: This page targets "WooCommerce POS card terminals", so the visitor it brings in is someone who wants to take card payments. They see "Pro" on every terminal, with no line saying these terminals need WCPOS Pro and no way to reach the page that explains Pro. The only route to /pro is the header nav. Because the badge glues straight onto the title in the text, it also reads as part of the product name ("…for WooCommercePro").
- Why it costs: This is the highest-intent visitor on the site, and the page leaves them unsure whether a terminal is a separate purchase, a paid plugin, or part of Pro. In SEO terms, /extensions is the second page a terminal searcher reaches, and it passes no in-body link to /pro, the conversion page.
- Fix: Add one sentence to the intro, e.g. "Extensions marked Pro need WCPOS Pro", with "WCPOS Pro" linked to /pro. Optionally give the badge `aria-label`/`title` "Requires WCPOS Pro" and a leading space, so the title text no longer runs into "Pro".
- Scope: ok. One message key and one link on an existing page, with no pricing wording.

## Worst defect — UI
- Page/viewport: /compare/* leaf pages (seen on /compare/square), phone 390px.
- Element: The breadcrumb "Compare WooCommerce POS systems › WCPOS vs Square for WooCommerce" wraps to two centred lines. Directly under it, the H1 "WCPOS vs Square for WooCommerce" repeats the same words in 2-line hero type.
- Problem: On phone the first screen shows the page name twice in a row. The crumb plus H1 take about 40% of the fold before any comparison content starts, and "The short answer" falls below the cookie bar. On desktop the crumb fits on one line, so this only happens on phone.
- Why it costs: Perceived padding on the page that has to convince a switcher quickly. The repeated title looks like a rendering glitch. The designer flagged it last round, and it is still live.
- Fix: Below `sm`, render only the parent crumb as a back link ("‹ Compare WooCommerce POS systems") and hide the current-page crumb visually. Keep the BreadcrumbList JSON-LD and the full trail for screen readers.
- Scope: ok. Styling in the shared breadcrumb component.

## Worst defect — SEO
- Page/viewport: /pro, all locales and viewports. The source is `src/components/pro/pro-buy-box.tsx:69`, which renders `<p className="text-lg font-semibold mb-1">{heading}</p>`.
- Element: "Get Pro" / "Hol dir Pro", the heading of the price box that shows "$129 USD/yr" and "$399 USD once". On phone it is the first block after the H1.
- Problem: The `<title>` is "Pro Features & Pricing for WooCommerce POS | WCPOS" ("Pro-Funktionen & Preise …" in de, "Pro-functies & prijzen …" in nl), but the pricing section is not in the document outline. The page has only two H2s, "What's included in Pro?" and "Frequently Asked Questions". The block that looks most like a heading on the phone fold is a styled `<p>`. In the outline, the prices sit inside the features section.
- Why it costs: Searches like "WCPOS Pro price" or "WooCommerce POS pricing" match the title, but the page has no heading for that section. Google cannot build a "Pricing" jump link or sitelink, and passage ranking has no section boundary to anchor on. Screen-reader heading navigation (H key) skips the price box entirely. This was a runner-up last round and is still live.
- Fix: Render the buy-box heading as an `<h2>` with the same classes, keeping the text "Get Pro". Optionally add an `id="pricing"` on the section so /pricing-style deep links and the home "See Full Pricing & Features" link can target `/pro#pricing`.
- Scope: ok. A one-element markup change, with no change to price wording or plan terms.

## Runner-up notes (max 3 lines)
- The shared `SoftwareApplication` JSON-LD in `src/lib/software-application-json-ld.ts` has no `description` or `softwareVersion`, and its `url` is always `https://wcpos.com`, even on /de and /nl. It should get `localeUrl(locale)`, the localized meta description, and `softwareVersion` from the release that /downloads already shows (2.0.4).
- Each compare leaf `<title>` repeats the brand and runs past about 60 characters, e.g. "WCPOS vs WooCommerce's Official POS (2026): An Honest Comparison | WCPOS" is 72 characters. Search results will cut it. Drop the "| WCPOS" suffix on these, since the brand already leads the title.
- On the home page, "Works with the equipment you already have" and "Pro connects card readers like Stripe Terminal and SumUp" have no link to /extensions, the page that targets the card-terminal queries.
