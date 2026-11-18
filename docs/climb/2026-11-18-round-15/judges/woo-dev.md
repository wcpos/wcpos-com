# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS for WooCommerce that turns a tablet into a register selling from the store's own catalog, stock and prices, even offline.
Why version 2: In 2.0, opening and closing the register, split payments and today's sales report are free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /downloads, desktop and phone. This is the Pro card in step 3, "Want more? Go Pro" (key `downloads` … `cardBody`, `messages/en.json:1715`; de and nl say the same).
- Element: "Unlock the full till — Payments, refunds, stock & pricing, order management, full reports, multi-store and priority Discord support."
- Problem: The card lists plain "Payments" first among the Pro unlocks. Higher on the same page, the Free plugin is said to "complete cash sales or sales on a separate card terminal". The home Free card lists "Cash or card on your own terminal" and "Split payments", and the step 3 line just above the card says Pro adds "*terminal* payments". What Pro adds is card-reader integrations and the store's other gateways, not payments as such. Round 14 fixed the refund example on this page, but this card still mixes up Free and Pro.
- Why it costs: /downloads is the page I read just before I install. If the upsell card says payments are Pro, I would tell a client that Free can't take money, or I would have to check the docs myself before I can recommend Free for the second store. Either way I lose trust in the site's Free/Pro lines just where the client decides.
- Fix: Change "Payments" to "Card-reader payments" (de "Kartenterminal-Zahlungen", nl "Betalingen via kaartlezers", and so on in every locale). This matches step 3's "terminal payments" and /pro's "Payment Terminal Integration".
- Scope: ok. Copy only, and it narrows an existing claim rather than adding one.

## Worst defect — UI
- Page/viewport: /extensions, desktop 1440 (all three cards in the fold) and phone 390. Third round running.
- Element: the accent-red link under every card, "Mercado Pago Terminal for WooCommerce documentation →" (`extensions.docsLink: "{name} documentation"`, rendered at `extensions/page.tsx:122`)
- Problem: Each card prints its full title again as a red link. In the desktop fold, every one of the three links wraps to two lines and is taller than the card's description. Across 15 cards, the repeated red names are the strongest thing on the page. They outweigh the white titles and the small "Pro" pills, which are what I scan to see which terminals exist and which need Pro.
- Why it costs: The page should answer "which hardware and stock plugins work, and on which tier?" at a glance. Instead the eye lands on the same name twice per card, and on phone every card gets two lines longer, so the list is much longer to scroll.
- Fix: Make the visible text "Documentation" (translated) and keep "{name} documentation" as the accessible name (`aria-label` or an sr-only span), so the anchors stay unique.
- Scope: ok

## Worst defect — SEO
- Page/viewport: / (home), all viewports. `src/components/home/features-section.tsx` has no `href`, and facts.json still counts 13 internal links on home, all of them header and footer. Third round running.
- Element: "Smooth checkout flow — … Pro connects card readers like Stripe Terminal and SumUp." and "Order history & management Pro"
- Problem: The home body names specific terminals and Pro features but links neither to /extensions (the card-terminal page with ItemList JSON-LD) nor to /pro. The only links into /extensions are in the footer. The /compare/* pages and /pro ("See all terminal extensions") already carry this kind of contextual link. Home, the page with the most authority, does not.
- Why it costs: Home passes no anchor text ("card readers", "Stripe Terminal") to the page that targets card-terminal searches. A developer checking hardware support also hits a dead end on the home page.
- Fix: In the "Smooth checkout flow" card, link "card readers like Stripe Terminal and SumUp" to /extensions, using the `t.rich` tag pattern from #759.
- Scope: ok

## Runner-up notes (max 3 lines)
- /pro "More Registers & Multiple Stores" still doesn't say that the stores are locations in one WooCommerce site. Next to the "2 sites (live + dev)" FAQ, a two-shop agency can read it as two licences. needs-front-desk (plugin fact check).
- /compare/square's "Card payments" row and body name six terminal integrations, while /extensions lists eight terminals (Mercado Pago, PayArc and Windcave are missing). Use "and more" with a link to /extensions.
- No page says how a POS sale lands in WooCommerce (order status, created-via, which tax address applies at the counter). After stock, that is a developer's next question.
