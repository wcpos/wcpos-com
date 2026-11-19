# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale for a WooCommerce store. It turns a tablet into the shop's register and sells from the store's own catalog, stock and prices, even offline.
Why version 2: The red "New in 2.0" line above the eyebrow says that opening and closing the register, split payments and today's sales are now free. The question is answered, though on desktop the line is still the smallest type above the H1.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: Home, both viewports (de and nl have the same issue; phone is worst). This is the section headed "Works for stores of all kinds".
- Element: The H2 "Works for stores of all kinds" sits over three cards tagged "Retail Store", "Market Vendor" and "Desktop & Offline". The third card's quote ends "…I believe there are more great features coming up."
- Problem: These three cards are the only customer reviews on the home page. The heading presents them as store types, not as reviews, so a visitor scanning the H2s never learns that real users are speaking. The pattern also breaks on the third card: "Desktop & Offline" is not a kind of store. That card also has the weakest quote. It praises a feature rather than an outcome, and it ends on a promise of future features right after the 2.0 launch the hero announces. This is the second round I have named it, and it is unchanged (`home.useCases.title` in `messages/en.json:97`).
- Why it costs: For a shop owner, proof is what turns "free" into "trustworthy". Here the page's best proof is labelled as market segments and closes on its weakest line. The only other quote ("Straightforward, functional and simple to use. 10/10.") is further down, in the stats band, with no heading.
- Fix: Retitle `home.useCases.title` in every locale so it says these are reviews, for example "What store owners say". Change the third tag from "Desktop & Offline" to a tag that fits its quote, such as "Weak internet". Both are copy changes in `messages/*.json`, with no new quotes and no new claims.
- Scope: ok

## Worst defect — UI
- Page/viewport: Home, phone 390×844 (en, de and nl). The component is the review cards in `src/components/home/use-cases-section.tsx:64`.
- Element: Each review card opens with a pastel band (`flex h-28 … ${uc.bandClasses}`, 112 px tall) that holds a single 40 px icon (shop, tent, laptop). Under the band come a grey tag pill ("Retail Store"), then the quote.
- Problem: On phone the cards stack in one column, so the three bands add about 340 px of decoration. At most scroll positions you see a pink or yellow block, a pill and part of a quote. The icon repeats what the pill already says. The next section, "Built for the demands of physical retail", is six more stacked cards, so the visitor scrolls roughly 3,000 px of cards in a row. The /pro feature list already shows the denser phone pattern, a small icon tile beside the text. This was my round-32 UI pick and a round-31 runner-up, and it is still unchanged.
- Why it costs: On phone the decoration takes more space than the proof it frames. The home phone page is already about 8,900 CSS px tall, so every screen of filler before "Start free. Upgrade when you need more." loses readers before the plan summary.
- Fix: Hide the band below `md` (`hidden md:flex`) so desktop keeps its look. Or, more lightly, use `h-14 md:h-28` on the band and `h-6 w-6 md:h-10 md:w-10` on the icon.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /compare hub `<title>`, both viewports.
- Element: "Compare WooCommerce POS Systems | WCPOS" (39 characters)
- Problem: The hub lists seven named rivals: Square, FooSales, Oliver POS, WooCommerce's official POS, Jovvie, Vitepos and YITH. Its meta description names four of them, but the title names none. The title is the generic H1 restated, with about 20 characters unused. Searches like "Square vs FooSales WooCommerce" or "WooCommerce POS alternatives" therefore match only the description, which Google often rewrites. In the SERP, the hub looks like every other listicle.
- Why it costs: This hub is the internal-link parent of every /compare/* page (20 internal links, ItemList JSON-LD). It is the page most likely to rank for broad "compare" and "alternatives" queries, and the title is the strongest on-page signal it has. Brand names in a title also lift click-through for searchers who already have a shortlist.
- Fix: Set the hub `metadata.title` to "Compare WooCommerce POS: Square, FooSales & More | WCPOS" (55 characters), with locale equivalents under 60 characters. This is a metadata change only, and the H1 can stay as it is.
- Scope: ok

## Runner-up notes (max 3 lines)
- /compare/square at phone width: the "At a glance" table repeats the grey two-line label "Square POS + Square for WooCommerce" above the right cell of every one of its 9 rows. That is about 18 lines of noise. Shorten the label in the stacked layout to "Square", or show it once as a sticky column header.
- /support (desktop and phone): in the capture, the WidgetBot Discord iframe under "Prefer to talk to a human?" is an empty 740×580 dark-grey block (about 440 px tall on phone). If it is slow for real visitors too, give it a skeleton or placeholder text, or load it only after a click.
- The proof label still differs between sections: the home hero says "5,000+ Active Stores" and the stats band says "5,000+ Active Installations". Use one label site-wide.
