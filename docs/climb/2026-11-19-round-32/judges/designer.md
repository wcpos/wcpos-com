# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale for a WooCommerce store. It turns a tablet into the shop's register and sells from the same catalog, stock and prices, even offline.
Why version 2: The red "New in 2.0" line over the eyebrow says that opening and closing the register, split payments and today's sales are now free. It is answered, but on desktop it is still the smallest type above the H1.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: Home, both viewports (phone is worst; de/nl have the same issue). This is the "Works for stores of all kinds" section.
- Element: The H2 is "Works for stores of all kinds". Under it are three cards tagged "Retail Store", "Market Vendor" and "Desktop & Offline". The third quote is "Great POS for your WooCommerce store, it has the desktop version which makes it better for places with weak internet connectivity. I believe there are more great features coming up."
- Problem: These three cards are the home page's only customer reviews. The heading frames them as store types, not as reviews, so a visitor who scans the headings never sees that real users are speaking. The pattern also breaks on the third card: "Desktop & Offline" is not a kind of store. Its quote is the weakest of the three. It praises a feature, not an outcome, and it ends on "more great features coming up", which reads as a promise right after the 2.0 launch the hero is announcing.
- Why it costs: Proof is what turns "free" into "trustworthy" for a shop owner. Here the best proof on the page is labelled as segmentation and ends on its weakest line. The stronger quote, Ward's "Straightforward, functional and simple to use. 10/10.", sits further down in the stats band, with no heading.
- Fix: Retitle `home.useCases.title` in every locale to say these are reviews, for example "What store owners say". Replace the third card's tag "Desktop & Offline" with a use tag that matches its quote, such as "Weak internet". Both changes are copy only, in `messages/*.json`. They add no new claims and no new quotes.
- Scope: ok

## Worst defect — UI
- Page/viewport: Home, phone 390×844 (en, de, nl), the review cards in `src/components/home/use-cases-section.tsx`.
- Element: Each of the three review cards opens with a pastel band (`flex h-28 … bandClasses`, 112 px tall) that holds a single 40 px icon. Under the band are a grey tag pill ("Retail Store"), then the quote and the attribution.
- Problem: The column is single on phone, so the three bands add about 340 px of pure decoration. On any one screen you see a pink band and a quote and a half. The icon repeats what the tag pill already says. The /pro feature list already shows the denser pattern on phone: a 48 px icon tile to the left of the text, with no band. The home "Built for the demands of physical retail" cards come right after these, so the visitor reads about 3,000 px of stacked cards in a row. This was a round-31 runner-up and has not been fixed.
- Why it costs: On phone, the decoration costs more than the content. The quotes are the page's proof and they are diluted by colour blocks. The home phone page is already about 8,900 px tall (CSS px), so every screen of filler before "Start free. Upgrade when you need more." loses readers before the pricing summary.
- Fix: Hide the band below `md` (`hidden md:flex`, which keeps the desktop look). As a lighter option, `h-14 md:h-28` with `h-6 w-6 md:h-10 md:w-10` on the icon. Desktop stays unchanged.
- Scope: ok

## Worst defect — SEO
- Page/viewport: Home `<title>`, both viewports (the same pattern is in nl "WCPOS - Kassasysteem voor WooCommerce" and de "WCPOS - Kassensystem für WooCommerce").
- Element: "WCPOS - Point of Sale for WooCommerce" (37 characters)
- Problem: The home page has the most link equity on the site, but it is the only main page whose title lacks the head term "WooCommerce POS". /pro, /downloads, /extensions, /support and /compare all use it. The title also never says "free", although free is the main differentiator and is already in the meta description. The bare hyphen separator also differs from the "| WCPOS" and "–" pattern on every other page. About 23 characters are left unused.
- Why it costs: Searches for "woocommerce pos" and "free woocommerce pos" are the queries that matter most for this product. The home snippet matches "point of sale" and "WooCommerce" separately, but never the phrase people type. The inner pages can end up outranking the home page for the head term.
- Fix: Set the home `metadata.title` to "WCPOS – Free WooCommerce POS (Point of Sale)" (44 characters). In nl and de use the equivalent, for example "WCPOS – Gratis WooCommerce-kassasysteem (POS)" and "WCPOS – Kostenloses WooCommerce-Kassensystem (POS)". Keep each under 60 characters. This is a metadata change only.
- Scope: ok

## Runner-up notes (max 3 lines)
- Proof label drift: the home hero says "5,000+ Active Stores" and /pro says "5,000+ active stores", but the home stats band says "5,000+ Active Installations". Pick one label site-wide. "Installations" is the wordpress.org metric, so it is the safer one.
- /extensions on phone: hero `py-20` plus a muted section `py-16` leave about 170 px of blank space between "Extensions marked Pro need WCPOS Pro." and "Card terminals and payments". /downloads got the #834 phone hero padding, but this page and /support did not.
- Home desktop nav: "Pro" is set darker than its sibling links on pages that are not /pro (home, /compare), so it reads like an active state. Use one link colour for inactive items, or give "Pro" a deliberate badge.
