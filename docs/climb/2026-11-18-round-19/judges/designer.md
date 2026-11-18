# Judge: designer (product designer)

## 10-second test
What is WCPOS: A point of sale for WooCommerce. It turns a tablet into the shop's register and sells from the same catalog, stock and prices as the online store, even offline.
Why version 2: In 2.0, opening and closing the register, split payments and today's sales are free. The red "New in 2.0" line above the kicker says so on desktop and phone, in en, nl and de.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /downloads, "What's new" (release history), desktop and phone, all locales.
- Element: "2.0.4 Latest Nov 17, 2026" is the only open entry. It begins with two bold bullets: "Receipts print each item's tax with the name and rate the order was charged, so reprinting an older order after a tax rate was renamed (WooCommerce Tax does this) no longer shows the new name and percent against the old amount." and "The orange "Important" upgrade notice on the Plugins screen shows as formatted text instead of raw HTML tags." A grey "Developers: an order push refused as a conflict (409) … `differs` …" line follows. "2.0.0 Nov 9, 2026" is closed, fifth in the list, under four patch releases.
- Problem: The home page's "New in 2.0" line sends visitors to this page. The section called "What's new" then opens on edge-case bug fixes in bold. The release worth selling is closed and buried under four patch numbers from the last eight days. The register, split-payment and today's-sales story never appears on the page that hands out 2.0. This is the same as last round; nothing changed.
- Why it costs: This is the last block before the download decision. "Four fixes in eight days, the first about wrong tax names on receipts" reads as instability. Two bold sentences read as warnings, not news.
- Fix: In `src/components/downloads/release-history.tsx:48`, replace `defaultOpen={index === 0}` with "open the newest `x.y.0` release" (2.0.0), and keep the "Latest" chip on 2.0.4. Add `[&_strong]:font-normal` (or the like) to the Markdown className so the release notes are set in regular weight.
- Scope: ok. The fix changes only the default open state and the type weight of an existing component. The copy stays the same.

## Worst defect — UI
- Page/viewport: /extensions, phone (390) on five cards in a row; desktop on "Windcave Terminal for WooCommerce" and "Mercado Pago Terminal for WooCommerce".
- Element: The "Pro" chip after the card titles "PayPal Reader for WooCommerce", "Square Terminal for WooCommerce", "Stripe Terminal for WooCommerce" and "SumUp Terminal for WooCommerce".
- Problem: The chip is a sibling of an inline `<h3>`, offset with `ml-2` (`src/app/[locale]/(main)/extensions/page.tsx:112-121`). When the title fills the line, the chip drops onto a line of its own. It keeps its 8 px left margin, so it sits indented from the title's left edge. On phone this happens on PayPal, Square, Stripe and SumUp in a row. On Windcave the chip stays on the title's second line, so the stack zigzags. #761 fixed the same pattern in `FeatureCard`, but these cards render their own titles.
- Why it costs: /extensions is the landing page for card-terminal searches. A column of stray, misaligned chips looks unfinished. A chip alone on its line reads as a separate label, not as "this one needs Pro". This is the fourth round I've noted it.
- Fix: Wrap the title's last word and the badge in one `whitespace-nowrap` span, which is the #761 technique. Alternatively, put the chip on its own line on purpose, with no `ml-2` (`block w-fit mt-1`).
- Scope: ok. The fix is markup and styling in one page component.

## Worst defect — SEO
- Page/viewport: /support, all locales, desktop and phone.
- Element: The H1 "How can we help?" and the meta description "Ask anything about WCPOS and get an instant answer from our docs, or chat with the community on Discord." (104 characters). The only H2 is "Prefer to talk to a human?".
- Problem: Now that /pro has a pricing heading, /support has the weakest outline on the site. The H1 and the H2 contain no product or query term ("WooCommerce POS", "support", "help"), and the title's "WooCommerce POS Help & Support" appears in no heading. The description is about 50 characters shorter than on every other page and does not say "WooCommerce".
- Why it costs: "WooCommerce POS support" and "WCPOS help" are navigational queries this page should win outright. A generic H1 and a short snippet give Google little to match on, and the result looks thin next to the forum results that compete for the same query.
- Fix: Keep "How can we help?" as the visible kicker and make the H1 "WooCommerce POS help & support" (or render the kicker as the H1 text with a product term). Extend `support.metadata.description` to about 150 characters by naming the topics already in the subtitle (setup, licensing, hardware, syncing, printing) and "WooCommerce POS".
- Scope: ok. The fix is copy and a heading in one page and its messages. It adds no new claims.

## Runner-up notes (max 3 lines)
- /support phone: the Ask button and the three suggestion chips are so pale they look disabled, and the placeholder is cut off at "receipt printe".
- /compare/square phone: the grey lead runs six lines and then leaves about 100 CSS px of blank space before "The short answer", so the fold is mostly prose and blank space.
- Home stat strip: "5,000+ Active Installations" contradicts the hero's "5,000+ Active Stores". In /de, "2014 / In Entwicklung seit" still reads backwards.
