# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce that turns a tablet into the store's register, using the same catalog, stock and prices, even offline.
Why version 2: The fold's top line says 2.0 adds opening and closing the register, split payments and today's sales, all free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: Home (`/`), desktop and phone, all locales. The "Built for the demands of physical retail" grid, card "Smooth checkout flow". The source is `src/components/home/features-section.tsx` and `messages/en.json:175`.
- Element: "Add items, apply discounts, take cash or card on your own terminal, and split a payment. Pro connects card readers like Stripe Terminal and SumUp."
- Problem: This is the home page's only mention of named card readers. It is plain text: nothing on the home page links to /extensions, the page that lists the supported terminals (Stripe, Square, SumUp, PayPal, Mollie, Windcave …) and now explains the Pro badge. The scroll story's "Works with the equipment you already have." makes the same promise ("Card terminals … Plug in what's already on your counter") with no link either. In the body, home links only to the demo, /downloads, /pro, /about-us and /compare.
- Why it costs: "Will it work with my card reader?" is the next question a shop owner asks after "what is it", and the page names two readers but gives no way to check theirs. It is also lost internal linking: /extensions targets the "WooCommerce POS card terminal / Stripe Terminal / SumUp" queries, but the site's strongest page links to it only from the footer.
- Fix: Make "card readers" (or a short "See supported card readers →" after the sentence) a link to `/extensions`, using a rich-text tag in `features.*.description`, in all locales.
- Scope: ok. One link and a message tag on an existing page. No new claim, because the readers are already named there and on /extensions.

## Worst defect — UI
- Page/viewport: The /compare/* leaf pages, phone (390 px), e.g. /compare/square. The source is the `subtitle` passed to `SectionHeading` in `src/app/[locale]/(main)/compare/square/page.tsx:156` (and its siblings).
- Element: "Many WooCommerce stores sell in person with Square's POS app and keep it in step with the Square for WooCommerce extension. Here is how that compares with a register built on WooCommerce itself, and when Square is the better choice."
- Problem: The 40-word lead is set centred, in large muted grey, across six lines on phone. Each line starts at a different x, so the eye has to hunt for every line start. Below it, "The short answer" and its body are left-aligned, so the alignment changes halfway down the fold. Round 17 flagged the same pattern on the /compare hub lead, and it repeats on all seven comparison pages.
- Why it costs: These pages are where a visitor actively choosing a POS lands from search. A hard-to-scan lead slows the step from the H1 to "The short answer", the block that makes the case.
- Fix: Left-align the compare hero subtitle below `sm` (`text-left sm:text-center` on the subtitle, scoped to the compare pages), so it lines up with the content under it.
- Scope: ok. A styling change on existing pages.

## Worst defect — SEO
- Page/viewport: /pro, all locales and viewports. The source is `src/components/pro/pro-buy-box.tsx:69`, which renders `<p className="text-lg font-semibold mb-1">{heading}</p>`.
- Element: "Get Pro" / "Hol dir Pro", the heading of the box that shows "$129 USD/yr" and "$399 USD once". On phone it is the first block under the H1.
- Problem: This is still live from round 17. The `<title>` is "Pro Features & Pricing for WooCommerce POS | WCPOS" ("Pro-Funktionen & Preise …", "Pro-functies & prijzen …"), but facts.json still lists only two H2s, "What's included in Pro?" and "Frequently Asked Questions". The block that looks most like a heading on the phone fold is a styled `<p>`, so in the outline the prices sit inside the features section.
- Why it costs: "WCPOS Pro price" and "WooCommerce POS pricing" match the title, but the page has no heading for that section. Google has no section boundary for a "Pricing" jump link or for passage ranking, and screen-reader heading navigation skips the price box.
- Fix: Render the buy-box heading as an `<h2>` with the same classes and the same text, and optionally give the section `id="pricing"` so the home "See Full Pricing & Features" link can point to `/pro#pricing`.
- Scope: ok. A one-element markup change, with no change to price wording or plan terms.

## Runner-up notes (max 3 lines)
- The shared `SoftwareApplication` JSON-LD (`src/lib/software-application-json-ld.ts`, used on home and /downloads) has no `description` or `softwareVersion`, and its `url` is always `https://wcpos.com`, even on /de and /nl, whose canonical is the locale URL.
- On /support (phone and desktop), the three suggested-question chips and "Ask" are greyed out until Cloudflare's "Verify you are human" passes, so they look broken. At 390 px the placeholder is cut to "e.g. How do I connect a receipt printe".
- The en /pro H1 "WCPOS Pro for WooCommerce POS" reads as stuffed with "POS" twice. The de and nl H1s ("WCPOS Pro – Kassensystem für WooCommerce") read naturally, so en could follow: "WCPOS Pro – point of sale for WooCommerce".
