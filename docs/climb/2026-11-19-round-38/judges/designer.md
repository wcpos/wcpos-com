# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale that turns the tablet, phone or computer you already have into a register for your WooCommerce store, selling from the same catalog, stock and prices, even offline.
Why version 2: The red "New in 2.0" line says opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare/square, desktop and phone, the "Which should you choose?" cards (carried over from round 37, still live)
- Element: "Choose WCPOS if: You want every sale, online and in person, to be a WooCommerce order sold from one catalog, with no second catalog to keep in sync, run more than one store, sell outside Square's eight countries, want a register in a web browser or in desktop apps for Windows, macOS and Linux, or want to use a payment gateway or card terminal other than Square." (`messages/en.json` around line 2480, `…body`)
- Problem: The page's verdict is one 60-word grey sentence that runs to nine lines in a 330 px card at desktop and longer at phone width. It strings six separate reasons together with commas and "or", so a reader can't scan them. The Square card beside it has four reasons in the same form, and its bottom half is left empty, so the two cards don't line up. Further up the page, the "doesn't do" and "genuinely better" sections already use a scannable icon list. The decision block, the one part a skimmer reads, is the only part that doesn't.
- Why it costs: A shop owner who scrolls a comparison page goes straight to "Which should you choose?". Here the answer is a paragraph to decode, and it sits right beside the "Try Live Demo" and "Download Free" buttons. When the reasons can't be scanned, the click loses its momentum, on the page built to win people who are weighing Square.
- Fix: Render each "Choose … if" body as a short check list (the ✓ list style the page already uses) with one reason per item: "Every sale should be a WooCommerce order, from one catalog" · "You run more than one store" · "You sell outside Square's eight countries" · "You want a browser or Windows/macOS/Linux register" · "You use a gateway or terminal other than Square". Do the same for the Square card.
- Scope: ok (the same claims, split into items; no new claims and no pricing)

## Worst defect — UI
- Page/viewport: /pro (en), desktop and phone, the "What's included in Pro?" feature list and the FAQ heading
- Element: "More Registers & Multiple Stores", "Payment Terminal Integration", "Customer-facing display", "Stock & Price Editing", "Order Management", "Customer Management", "Reports Across Days, Registers & Stores", "Custom Payment Gateways"; "Frequently Asked Questions" (`messages/en.json` `pro.features.*.title`, `pro.faq.title`)
- Problem: The same list mixes cases. Seven titles are in Title Case and "Customer-facing display" is in sentence case. The rest of the site uses sentence case for the same features: the home cards read "Reports across days, registers & stores" and "Order history & management", and /compare/square reads "Frequently asked questions". So one feature is spelled two ways depending on the page, and /pro's FAQ heading doesn't match the one on /compare. The nl and de /pro lists are already consistent, so only en is affected.
- Why it costs: This is the money page. The feature column sits right beside the buy box, and the eye runs down those eight titles while deciding. Mixed casing in a single list looks like copy pasted from different places, which is the opposite of the "well looked after" signal a paid add-on needs. Title Case also makes the longest title, "Reports Across Days, Registers & Stores", wrap to two heavy lines at phone width.
- Fix: Set the eight en `pro.features.*.title` strings to sentence case to match the home cards: "More registers & multiple stores", "Payment terminal integration", "Stock & price editing", "Order management", "Customer management", "Reports across days, registers & stores", "Custom payment gateways". Set `pro.faq.title` to "Frequently asked questions".
- Scope: ok (en copy only; no pricing or plan wording)

## Worst defect — SEO
- Page/viewport: /pro and every locale /pro, JSON-LD (`SoftwareApplication`, from `pro.schema.description`)
- Element: "Premium Point of Sale plugin for WooCommerce. Adds payment terminal integration, stock and price editing, order and customer management, full reports, custom payment gateways, and priority support."
- Problem: The structured description leaves out what the page leads with. The first feature card, the meta description ("more registers and multiple stores, terminal payments, …") and the FAQ ("more registers and the tools listed above need Pro") all start with more registers and multiple stores, and the schema never mentions either. It also leaves out the customer-facing display, and it opens with the empty word "Premium". de and nl copy the same list, so all eleven locales send search engines a product summary that disagrees with the visible page and the meta tag.
- Why it costs: Google and AI answer engines read the SoftwareApplication description as the product's own summary. "Multi-store" and "multiple registers" are the main reasons a WooCommerce shop upgrades, and they are terms people search for ("WooCommerce POS multiple stores"). Leaving them out of the one machine-readable summary weakens /pro for exactly those queries and creates a mismatch between the schema and the page.
- Fix: Rewrite `pro.schema.description` in all locales to follow the meta description's order: "WCPOS Pro for WooCommerce: more registers and multiple stores, payment terminal integration, a customer-facing display, stock and price editing, order and customer management, full reports, custom payment gateways and priority support."
- Scope: ok (markup text only; no pricing, no new claims, since every item is already a visible /pro card)

## Runner-up notes (max 3 lines)
- /support H1 is still off the type scale (`text-3xl md:text-4xl` at support-chat.tsx:178 and :350, against 48 px tight-tracked H1s on /pro, /compare and /extensions), and on phone it breaks as "help / & support". Third round named.
- /compare/square desktop: "At a glance" and its table start at x≈224, while every other H2 and the prose start at x≈352, so the left edge jumps once. There is also a doubled gap of about 190 px between the FAQ and "Sources".
- de /pro uses three words for priority support, "Prioritätssupport" (hero), "vorrangiger Support" (features, FAQ) and "Priority-Support" (expiry FAQ), and de home adds a fourth, "Priorisierter Support". This is the German version of last round's nl fix.
