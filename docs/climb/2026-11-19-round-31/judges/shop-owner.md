# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free, open-source app that turns my tablet into the till for my WooCommerce shop, using the same products, stock and prices, and it keeps going when the internet drops.
Why version 2: 2.0 makes opening and closing the register, split payments and today's sales free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare/square, phone 390x844 (desktop has the same order, but the scroll is shorter)
- Element: "The short answer" section ("WCPOS is a register built on WooCommerce itself … for a one-time payment that never switches off."). After it come the disclosure card, the "At a glance" table, "One system or two?", "How do card payments work?", "What does it cost?", "What Square for WooCommerce doesn't do" and "Where Square is genuinely better". The first button, "Try Live Demo" / "Download Free", is in "Which should you choose?", about 8,000 px down on phone. Before that, the only way on is an inline "demo.wcpos.com/pos" text link in the middle of "What does it cost?" (`compare/square/page.tsx:250`).
- Problem: I came to this page because Square is on my shortlist. The short answer already tells me what I needed: every sale is a WooCommerce order, there's no second catalog, and it's free. At that point I'm ready to try it, but there is no button. Getting to one means scrolling past seven sections of tables and fine print written for someone still undecided.
- Why it costs: This is the page that decides between WCPOS and Square for owners like me. Visitors who are convinced early have nothing to click while they're convinced. On a phone, many will close the tab before they reach "Which should you choose?". Square's own pages put the sign-up button at the top.
- Fix: Under the short answer, add the existing CTA pair, "Try Live Demo" (demo.wcpos.com/pos) and "Download Free" (/downloads), using the same keys and component as "Which should you choose?". Use the same short-answer slot on the other six comparison pages for consistency.
- Scope: ok (it reuses the existing buttons and copy; no new claim, no price wording)

## Worst defect — UI
- Page/viewport: /downloads, phone 390x844. /extensions on phone has the same issue (de and nl too).
- Element: The /downloads hero: "DOWNLOADS / Download WooCommerce POS / One register, every device." It still uses the full hero padding (`py-20` on phone, the `hero` spacing in `components/ui/section.tsx`). /extensions also uses `spacing="hero"` (`extensions/page.tsx:71`).
- Problem: About 80 px of empty band sits between the nav and the "DOWNLOADS" eyebrow. The first screen ends at "Install the free plugin", so the actual download button and the "Upgrading from 1.11?" note are below the fold, under the cookie bar. On /extensions, the band above the H1 plus about 150 px of gap before "Card terminals and payments" means no terminal card fits completely on the first screen. /pro (#826) and every comparison page already use the tighter phone hero.
- Why it costs: I opened Downloads to download something, and the first screen is mostly heading and empty space. Next to /pro and /compare it also looks unfinished, as if these two pages missed a tidy-up.
- Fix: Give the /downloads and /extensions heroes the /pro phone padding (`spacing="none"` with `pt-10 pb-6 sm:pt-20 sm:pb-8 md:pt-24 md:pb-10 lg:pt-28`). Trim the top padding of the next /extensions section on phone to `pt-8`. Leave desktop unchanged.
- Scope: ok (phone-breakpoint padding on two existing pages; no copy changes)

## Worst defect — SEO
- Page/viewport: /pro in de, fr and pt: the meta description, which is the search snippet
- Element: de (142): "WCPOS Pro für WooCommerce: weitere Kassen und mehrere Filialen, Terminalzahlungen, Lager- und Preisbearbeitung, Bestell- und Kundenverwaltung." fr (160): "… modification du stock, des prix, des commandes et des clients." pt (138): "… gestão de encomendas e clientes." (`pro.metadata.description` in `messages/{de,fr,pt}.json`)
- Problem: The en, nl, es, it, ja, zh and ko descriptions all end with "full reports". de, fr and pt drop reports, even though the de hero on the same page says "vollständige Berichte". Since 2.0 made today's report free, reports across days, registers and stores are one of the main things Pro adds, and these three snippets leave that out. This is the same three locales that lacked "2.0" in the home description last round.
- Why it costs: A German, French or Portuguese owner searching for a WooCommerce POS with sales reports sees a /pro snippet that doesn't mention reports, and the page loses relevance for "Berichte", "rapports" and "relatórios" queries. de and pt also have 18 to 22 characters of room left unused.
- Fix: Add reports and stay at 160 characters or fewer. de (150): "WCPOS Pro für WooCommerce: mehr Kassen und Filialen, Terminalzahlungen, Lager- und Preisbearbeitung, Bestell- und Kundenverwaltung und volle Berichte." fr (153): "WCPOS Pro pour WooCommerce : plus de caisses et de boutiques, paiements par terminal, stock et prix modifiables, commandes, clients et rapports complets." pt: add "e relatórios completos" and tighten to fit.
- Scope: ok (metadata copy only; it repeats a feature the page already lists)

## Runner-up notes (max 3 lines)
- /downloads: the Web option, both in the hero picker ("Open the web demo") and in step 2 ("Open the live demo"), only goes to the public demo. For a market stall on a phone browser, nothing says how to open the register on my own store. A link to the setup guide would fix it (second round in a row).
- /compare/square, "At a glance" › "Card payments": the list is Stripe, SumUp, PayPal, Square, Mollie and Vipps. /extensions also lists Mercado Pago, PayArc and Windcave, so the comparison undersells the terminal choice.
- The home "Market Vendor" testimonial (ceramicist selling at markets) is the best proof on the site for owners like me. It sits below the scroll story, well down the phone page, and nothing near the pricing block points back to it.
