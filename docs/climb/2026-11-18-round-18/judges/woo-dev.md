# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source point-of-sale plugin for WooCommerce that turns a tablet into a register selling from the store's own catalog, stock and prices, even offline.
Why version 2: In 2.0 you can open and close the register, split payments and see today's sales for free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, desktop and phone, in the "What's included in Pro?" list. The home "Start free. Upgrade when you need more." Pro column has the same gap. Both are the same in nl and de.
- Element: the eight /pro feature cards ("More Registers & Multiple Stores" … "Custom Payment Gateways") and the home Pro list ("More registers & multiple stores" … "Priority support"). Coupons appear in neither. Every /compare/* page says "Pro adds: … a customer-facing display, the Coupons screen, refunds at the register, … store-specific pricing … and the extension directory" (`compare.*.pricing.proAdds`). The 1.9.0 release note on /downloads says "Pro coupons & refunds at the POS".
- Problem: WooCommerce coupons are a core integration question for any client. The page that sells Pro doesn't say they need Pro, and the home free card "Smooth checkout flow — Add items, apply discounts…" suggests they might be free. The truth is only on comparison pages and in an old release note. /pro also leaves out the extension directory, which the compare pages list. So the canonical free-vs-Pro page gives a shorter list than the site's own comparisons.
- Why it costs: I build my quote from /pro. If my client's in-store promos rely on WooCommerce coupons and I learn after install that they need Pro, I look careless to the client. When two pages disagree about what's in the paid tier, I stop trusting either one without a sales email, which the site is meant to make unnecessary.
- Fix: Extend the /pro "Order Management" card body, or add a short card, to say "apply WooCommerce coupons at the register" (wording taken from the existing compare copy). Add "Coupons at the register" to the home Pro list (`home.pricing` Pro items), in every locale.
- Scope: ok. It repeats a Pro feature the site already states on seven compare pages, with no new claim and no pricing change.

## Worst defect — UI
- Page/viewport: every page except /pro, desktop 1440. It shows in this round's home and /extensions fold shots. It is unchanged since round 16 and is on the round-18 candidate list.
- Element: the header nav item "Pro". `navItemClass(active, highlight)` in `src/components/main/site-nav.tsx` gives it full foreground colour while Downloads, Documentation, Support and Roadmap are muted grey.
- Problem: On pages with no matching nav item (/, /extensions, /compare/*), the dark "Pro" is the only marked item, so it reads as "you are here". On /extensions it sits right above the new line "Extensions marked Pro need WCPOS Pro", which makes the whole catalog look like part of the Pro section. /pro's real active state is a pink pill, so the site has two "selected" treatments.
- Why it costs: Wayfinding is the one place a visitor expects the UI to be literal. A developer weighing an open-source tool reads the active-looking upsell as a nudge and trusts the layout a little less.
- Fix: Drop the `highlight` colour so "Pro" matches its neighbours. If it must stand out, use a small badge, not the colour that means "active".
- Scope: ok

## Worst defect — SEO
- Page/viewport: home, all viewports, in the "Built for the demands of physical retail" grid (`src/components/home/features-section.tsx`). Nothing in the component renders a link.
- Element: the "Smooth checkout flow" card text "Pro connects card readers like Stripe Terminal and SumUp." and the four `<Badge variant="pro">Pro</Badge>` cards ("Customer profiles", "Order history & management", "Edit stock & prices on the fly", "Reports across days, registers & stores"). None of them link anywhere. The hardware act "Bring your own hardware — Card terminals, thermal receipt printers, barcode scanners" doesn't link either.
- Problem: The home page has the most link equity on the site. It names the terminal brands that /extensions targets ("WooCommerce POS Extensions & Card Terminals") and links to /extensions only from the footer. Its Pro badges don't link to /pro. The most relevant body anchors on the site go unused.
- Why it costs: In ranking terms, /extensions gets only boilerplate footer links, and none with terminal anchor text. For me, the first place I see "Stripe Terminal and SumUp" is a dead end: I can't jump to the full terminal list (Square, Mollie, PayPal Reader, Windcave, Mercado Pago…) to check my client's processor.
- Fix: Make "card readers like Stripe Terminal and SumUp" a link to /extensions, and link the hardware act's "Card terminals" the same way. Optionally, make each Pro badge in the grid link to /pro.
- Scope: ok

## Runner-up notes (max 3 lines)
- The multi-store vs licence question is still open: the /pro card says "run several stores" and the FAQ says "2 sites, one live and one dev". Nothing says a Pro store is a location inside one WooCommerce site. This is my biggest buying question, and it is still waiting on the front-desk fact check.
- /pro still has only two H2s. The price box title "Get Pro" is a `<p>`, so the pricing block has no heading.
- The /compare/square card-payments row lists six terminals, while /extensions lists ten (Mercado Pago, PayArc, Windcave and Email Invoice are missing from the row).
