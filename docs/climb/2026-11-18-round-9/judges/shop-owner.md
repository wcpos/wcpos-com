# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free till for my WooCommerce shop that runs on a tablet at the counter, with the same products, stock and prices as my website, and keeps working when the internet drops.
Why version 2: In 2.0 I can open and close the register, split a payment and see today's sales, and all of that is free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, desktop and phone, in the "What's included in Pro?" grid (`messages/en.json` `pro.features.terminal`).
- Element: "Payment Terminal Integration — Connect card readers and payment terminals for fast, accurate in-person payments."
- Problem: My market stall depends on a card reader, so this is the card I would pay Pro for. It names no reader and links nowhere. The site does know the answer. Home says "Pro connects card readers like Stripe Terminal and SumUp". /compare/square lists Stripe Terminal, SumUp, PayPal Reader (Zettle), Square Terminal, Mollie Terminal and Vipps MobilePay. The /extensions meta names Windcave as well. But the page that asks for $129 is the one place where I can't tell whether my reader is supported.
- Why it costs: "Does it work with my reader?" decides this choice for a market seller. Square answers it with its own hardware, and FooSales names its readers. A generic line here sends me back to the comparison sites, or to Square, at the moment I'm closest to buying.
- Fix: Name the supported readers in the card copy ("Stripe Terminal, SumUp, PayPal Reader (Zettle), Square Terminal, Mollie and more"), using the same list as /extensions, and add a "See card terminals →" link to /extensions. Do this in each locale.
- Scope: ok (copy and a link on an existing card, using integrations the site already lists; no price or plan terms)

## Worst defect — UI
- Page/viewport: /compare/square and the /compare hub (shared compare layout), phone 390 px.
- Element: The first screen is the H1 "WCPOS vs Square for WooCommerce", a 6-line centred intro, and the 7-line "Who runs this comparison" card ("This page is published by kilbot, the maker of WCPOS. We obviously have a horse in this race…"). "The short answer" starts below the fold, and "At a glance" starts about two screens further down.
- Problem: I tapped through to see Square against WCPOS. On my phone, the whole first screen is preamble and a disclaimer, and the disclaimer box is as tall as the intro. On the hub, the same card pushes the first comparison card (Oliver) off screen, so the FooSales and WooCommerce-POS cards I came for are three or more scrolls away. This was named last round and is unchanged.
- Why it costs: When I skim on a phone, I decide from the first screen whether a page will answer me. A block of caveats before any facts reads as hedging, and I leave before I reach the strong "every sale is a WooCommerce order" line.
- Fix: On phone (below `md`), shrink the disclosure card to one line ("Published by the maker of WCPOS — every fact sourced and dated") with the full text behind a disclosure toggle, or move it below "The short answer" and the hub's card list. Keep desktop as it is.
- Scope: ok (ordering or styling in the shared compare component; no copy claims change)

## Worst defect — SEO
- Page/viewport: /support, all viewports (facts.json; `messages/en.json` `support.meta.title`).
- Element: `<title>` "Support | WCPOS", and H1 "How can we help?"
- Problem: Neither the title nor the H1 contains "WooCommerce" or "POS". Every other captured page now puts a search term in its title, for example "Download WooCommerce POS for Mac, Windows, Linux & Web" and "WooCommerce POS Extensions & Card Terminals". A shop owner searching "WooCommerce POS support" or "WCPOS help offline" sees a brand-only snippet, and the page can rank only for the brand name.
- Why it costs: Before I commit to a free plugin with no salesperson, I check whether I can get help. A support page that ranks for "WooCommerce POS help" is proof the product is looked after, and right now it is invisible to anyone who doesn't already type "WCPOS".
- Fix: Change `support.meta.title` to "WooCommerce POS Help & Support" (rendered as "… | WCPOS") in en, with each locale's equivalent within its title budget.
- Scope: ok (one metadata string per locale)

## Runner-up notes (max 3 lines)
- The /downloads H1 "One till, every device." still has no search term ("WooCommerce POS" or "apps"). It has been open for four rounds.
- The compare disclosure says "published by kilbot". A non-technical owner doesn't know who kilbot is, and the name reads like a bot. "Paul, the maker of WCPOS" or "the WCPOS team" would earn more trust.
- Home Free card lists "Basic checkout", which undersells what 2.0 gives free (cash, card-on-your-own-terminal, split payments) and reads as "crippled" next to Pro's list.
