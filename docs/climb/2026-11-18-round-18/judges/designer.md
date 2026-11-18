# Judge: designer (product designer)

## 10-second test
What is WCPOS: A point of sale for WooCommerce that turns a tablet into the register, selling from the same catalog, stock and prices as the online shop, even offline.
Why version 2: 2.0 makes opening and closing the register, split payments and today's sales free. The red "New in 2.0" line above the kicker says so on desktop and phone, in en, nl and de.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /downloads, "What's new" (release history), desktop and phone, all locales.
- Element: The only expanded entry is "2.0.4 Latest Nov 17, 2026". It opens with two semibold paragraphs: "Receipts print each item's tax with the name and rate the order was charged, so reprinting an older order after a tax rate was renamed (WooCommerce Tax does this) no longer shows the new name and percent against the old amount." and "The orange "Important" upgrade notice on the Plugins screen shows as formatted text instead of raw HTML tags." Below that is a grey "Developers: … (409) … `differs` …" line. "2.0.0 Nov 9, 2026" is collapsed, fifth in a list of four patch releases.
- Problem: The home page sends visitors here with "New in 2.0". The section titled "What's new" then shows edge-case bug fixes in heavy type, and the release it should be selling sits closed under four patch numbers from the last eight days. On phone the open 2.0.4 entry fills a whole screen. Two whole sentences set in semibold read as warnings, not news.
- Why it costs: This is the last block a visitor reads before choosing a build. "Four fixes in eight days, the first about wrong tax labels on receipts" reads as instability right at the download decision. The 2.0 story (register, split payments, today's sales) never appears on the page that hands out 2.0.
- Fix: In `src/components/downloads/release-history.tsx:49`, open the newest `x.y.0` release (2.0.0) by default instead of `index === 0`, keeping the "Latest" chip on 2.0.4. Set release-note bullets in regular weight, not semibold.
- Scope: ok. This changes the default state and type weight of an existing component. The copy is untouched.

## Worst defect — UI
- Page/viewport: /extensions, phone (390) on most badged cards; desktop on "Windcave Terminal for WooCommerce" and "Mercado Pago Terminal for WooCommerce".
- Element: The "Pro" chip after the card titles "PayPal Reader for WooCommerce", "Square Terminal for WooCommerce", "Stripe Terminal for WooCommerce", "SumUp Terminal for WooCommerce" and others.
- Problem: The chip is a sibling of an inline `<h3>` with `ml-2` (`src/app/[locale]/(main)/extensions/page.tsx:112-121`). When the title fills the line, the chip wraps alone onto a second line, still carrying its 8 px left margin. It then sits indented from the title's left edge as an orphan. On phone this happens on five consecutive terminal cards, so the left edge of the card stack zigzags. #761 fixed this pattern for `FeatureCard` (last word and badge in one nowrap span), but the /extensions cards render their own title and never got the fix.
- Why it costs: /extensions is the page that catches card-terminal searches. A row of stray, misaligned chips makes it look unfinished, and a chip alone on a line reads as a separate label rather than "this one needs Pro". This is the third round I've noted it.
- Fix: Wrap the title's last word and the badge in one `whitespace-nowrap` span (the #761 technique), or reuse `FeatureCard`'s title helper. Drop `ml-2` when the chip starts a line.
- Scope: ok. This is markup and styling in one page component.

## Worst defect — SEO
- Page/viewport: /pro, all locales, desktop and phone.
- Element: The price box title "Get Pro" (nl/de "Hol dir Pro") is `<p className="text-lg font-semibold mb-1">` at `src/components/pro/pro-buy-box.tsx:69`. The page's headings are H1 "WCPOS Pro for WooCommerce POS", then H2 "What's included in Pro?" and H2 "Frequently Asked Questions".
- Problem: The title promises "Pro Features & Pricing", but no heading on the page covers pricing. The price box is the most important block on the page, and in the outline it is anonymous. "Get Pro" is a button label dressed as a heading: it has a heading's look but no heading's role or keyword.
- Why it costs: "WCPOS pricing" and "WooCommerce POS pricing" are high-intent queries this page should own. A heading-less price block weakens that match and the passage ranking. Screen-reader users navigating by headings also skip straight past the plans.
- Fix: Render the buy-box title as `<h2>` with the same classes, and change `pro.buyBox.heading` to "Pro pricing" (localised: "Pro-Preise", "Pro-prijzen").
- Scope: ok. The heading names no price or term and leaves the plan wording untouched.

## Runner-up notes (max 3 lines)
- /support: H1 "How can we help?" carries no product term, and the meta description is still 104 characters. The Ask button and the suggestion chips are so pale they read as disabled, and the phone placeholder clips at "receipt printe".
- Home stat strip: "5,000+ Active Installations" contradicts the hero's "5,000+ Active Stores". /de keeps "5,000+" in English number format, while /nl correctly shows "5.000+". In /de, "2014 / In Entwicklung seit" reads backwards.
- Header "Pro" nav item is near-black on every other page and still reads as active next to the real active pill. It is documented intent (#729), so I'm not picking it. Worth one more look by the owner.
