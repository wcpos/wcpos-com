# Judge: designer (product designer)

## 10-second test
What is WCPOS: A point of sale for WooCommerce. It turns a tablet into the shop's register and sells from the same catalog, stock and prices as the online store, even offline.
Why version 2: Version 2.0 makes opening and closing the register, split payments and today's sales free. The red "New in 2.0" line above the kicker says so on desktop and phone, in en, nl and de.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /downloads, the "What's new" release history, desktop and phone, all locales.
- Element: "2.0.4 Latest Nov 17, 2026" is the only entry that is open. It starts with two bold bullets: "Receipts print each item's tax with the name and rate the order was charged, so reprinting an older order after a tax rate was renamed (WooCommerce Tax does this) no longer shows the new name and percent against the old amount." and "The orange "Important" upgrade notice on the Plugins screen shows as formatted text instead of raw HTML tags." "2.0.0 Nov 9, 2026" is closed and fifth in the list, under four patch releases from the last eight days.
- Problem: The home "New in 2.0" line leads visitors to the page that hands out 2.0. There, the "What's new" section opens on bold bug-fix sentences about wrong tax names and raw HTML. The release worth selling (register, split payments, today's sales) stays closed at the bottom. This is the third round I have named it, and nothing has changed.
- Why it costs: This is the last block before the download decision. Four patches in eight days, the first one about wrong tax on receipts, and set in bold, reads as instability rather than news.
- Fix: In `src/components/downloads/release-history.tsx:49`, open the newest `x.y.0` release (2.0.0) instead of `index === 0`, and keep the "Latest" chip on 2.0.4. Add `[&_strong]:font-normal` to the notes' Markdown className so the bullets are set in regular weight.
- Scope: ok. The fix changes only the default open state and the type weight of an existing component. The copy stays the same.

## Worst defect — UI
- Page/viewport: /extensions, phone (390). Five cards in a row are affected: Mollie, PayArc, PayPal Reader, Square and Stripe Terminal. On desktop, the Windcave and Mercado Pago cards are affected.
- Element: The "Pro" chip after card titles such as "PayPal Reader for WooCommerce" and "Square Terminal for WooCommerce".
- Problem: The chip is an inline sibling of an inline `<h3>` with `ml-2` (`src/app/[locale]/(main)/extensions/page.tsx:112-122`). When the title fills the line, the chip falls onto a line of its own. It keeps its 8 px left margin, so it sits indented from the title's left edge. On phone the result is a column of stray, slightly offset chips down the page. #761 fixed the same pattern in `FeatureCard`, but these cards render their own titles. This is the fifth round I have named it.
- Why it costs: /extensions is the landing page for card-terminal searches, and these are the Pro add-ons. Misaligned orphan chips look unfinished. A chip alone on a line reads as a separate tag, not as "this one needs Pro".
- Fix: Put the chip on its own line on purpose: make the wrapper `flex flex-col items-start gap-1`, or give the badge `block w-fit mt-1` and drop `ml-2`. The alternative is to wrap the title's last word and the badge in one `whitespace-nowrap` span, as #761 did.
- Scope: ok. The fix is styling in one page component.

## Worst defect — SEO
- Page/viewport: home and /downloads in every locale (all viewports). The defect is in the JSON-LD.
- Element: The `SoftwareApplication` object from `src/lib/software-application-json-ld.ts`. It has `url: 'https://wcpos.com'` on every locale, and it has no `description` and no `softwareVersion`.
- Problem: /de, /nl and the other locale home pages each declare the app with the en URL. The entity has no description, even though each page has a good localized meta description. The version that the whole site is built around (2.0, currently 2.0.4 on /downloads) appears nowhere in the structured data.
- Why it costs: The rich result and knowledge panel have only a name and a price to work with, and the locale pages point the entity at the en page, which weakens the hreflang set. A visitor searching "WooCommerce POS 2.0" gets no version signal from the markup.
- Fix: Pass `url` (the locale's canonical), `description` (the page's `home.meta.description` / downloads description) and `softwareVersion` (the latest plugin version already loaded by /downloads) through the existing `extra` argument.
- Scope: ok. These are metadata fields from existing copy and data. They add no new claims.

## Runner-up notes (max 3 lines)
- /downloads phone: the six-tile platform picker fills the fold, and "Download for macOS" sits below it. On phone, the detected card could come before the picker. The subtitle "One till, every device." also says "till" while the rest of the site says "register".
- /support phone: the H1 breaks as "WooCommerce POS help / & support", with the ampersand starting the line (`text-balance` or a non-breaking space would fix it). The Ask button and chips still look disabled, and the placeholder is still clipped at "receipt printe".
- Home stat strip: "5,000+ Active Installations" contradicts the hero's "5,000+ Active Stores". /compare's description is 162 characters, which is just over the usual snippet length.
