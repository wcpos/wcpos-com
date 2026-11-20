# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale that puts your WooCommerce store's own catalog, stock and prices on a register at the shop counter.
Why version 2: The "New in 2.0" line says opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /nl/pro, desktop and phone, the intro under "Wat zit er in Pro?"
- Element: "Alles uit Free, plus de tools om je hele winkel vanaf de kassa te runnen — en priority support wanneer je hulp nodig hebt." (`pro.features.subtitle` in `messages/nl.json`)
- Problem: Two English terms sit in the middle of a Dutch sentence. "Free" is used as a product name, and "priority support" is left untranslated. The H1 subline two lines above already says "uit de gratis POS … en prioriteitssupport", so the page uses two words for the same thing within one screen. No other locale does this: de, fr, es, it, pt, ja, ko and zh all translate both terms. The same subtitle in German ("Gratis-Version … vorrangiger Support") shows the fix.
- Why it costs: This is the money page, and the paragraph is the first one in the feature column, right beside the buy box. A Dutch shop owner reads a half-translated sentence at the moment they are deciding whether to pay. It looks unfinished, and it makes them wonder whether Dutch support and the Dutch app are equally rough.
- Fix: Set `nl.pro.features.subtitle` to "Alles uit de gratis versie, plus de tools om je hele winkel vanaf de kassa te runnen — en prioriteitssupport wanneer je hulp nodig hebt."
- Scope: ok (one nl string; no pricing or plan wording touched)

## Worst defect — UI
- Page/viewport: /support, desktop and phone, hero (carried over from round 36, not yet fixed)
- Element: H1 "WooCommerce POS help & support" (`src/components/support/support-chat.tsx:178` and `:350`, `mb-2 text-3xl font-bold md:text-4xl`)
- Problem: This is still the only hero H1 off the site's type scale. /pro, /compare, /extensions and /downloads set the H1 at 48 px with tight tracking, and /support sets it at 36 px with normal tracking and 8 px of space before the lede. On phone the H1 breaks as "…help / & support", leaving the ampersand at the start of the second line. On desktop the pale input and the chips carry more visual weight than the headline.
- Why it costs: Coming from /pro or /downloads, the header drops a size and loses its tracking, so /support looks like a different template. That is the page where a stuck customer judges how well the product is looked after.
- Fix: In both `<h1>`s, use the shared hero classes `text-4xl md:text-5xl font-bold tracking-tight` with `mb-4`, matching /extensions and /compare. Optionally put a `&nbsp;` before "support" in the en string so "& support" stays together.
- Scope: ok

## Worst defect — SEO
- Page/viewport: home (/ and every locale home), JSON-LD
- Element: JSON-LD types on `/`: "Organization", "SoftwareApplication". There is no `WebSite` node.
- Problem: The home page gives no `WebSite` entity with `name: "WCPOS"`, `alternateName` or `url`. Google reads that entity to choose the site name shown above every result. The page title ("WCPOS - Point of Sale for WooCommerce") and Organization help, but the site name stays a guess, because "WooCommerce POS" appears more often than "WCPOS" in the copy across the site.
- Why it costs: Every wcpos.com result can show the bare domain, or a guessed name, instead of "WCPOS" in the site-name slot. Brand recognition is weaker in the WooCommerce-POS search results, where the site competes with the woocommerce.com listings.
- Fix: Add a `WebSite` JSON-LD node to the home page (`name: "WCPOS"`, `alternateName: "WooCommerce POS"`, `url: "https://wcpos.com/"`, `inLanguage` per locale) next to the existing Organization node.
- Scope: ok (markup only, no visible change)

## Runner-up notes (max 3 lines)
- /pro buy box (en and nl, desktop): the Yearly row is cramped. In en, "year" drops onto its own line. In nl, the "Meest populair" chip wraps under "Jaarlijks" and "voor 1 jaar" wraps. This is the price column's width (layout), not the wording, but it is close to the pricing hold.
- /pro "pair it to a till with a code": the site's word everywhere else is "register" (named in round 36, still live).
- Home on phone: the stacked hero CTAs have different widths. In de the gap is about 110 px ("Live-Demo testen" vs "Kostenlos herunterladen"). This is inside the scroll-story, so it waits on the owner's PR.
