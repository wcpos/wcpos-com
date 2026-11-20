# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: a free, open-source point of sale for WooCommerce. It turns a tablet, phone or computer into a register that sells from the store's own catalog, stock and prices, even offline.
Why version 2: the red "New in 2.0" line above the kicker says that opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare/square, all viewports. The "At a glance" table and the "How do card payments work?" section, about one screen apart.
- Element: the table's Card payments cell says "Pro terminal integrations: Stripe Terminal, SumUp, PayPal Reader (Zettle), Square Terminal, Mollie Terminal, Mercado Pago, PayArc, Windcave; Vipps MobilePay by QR code or push". The prose a screen later says "add card-terminal integrations for Stripe Terminal, SumUp, PayPal Reader (Zettle), Square Terminal, Mollie Terminal, and Vipps MobilePay" (`compare.square.payments.wcpos`, en.json:2294).
- Problem: one page gives two different lists of the same thing. The prose leaves out Mercado Pago, PayArc and Windcave. It also calls Vipps MobilePay a card terminal, which the table above (and `glance-terminals.test.ts`) says it is not. The round 42 record deferred this as "eight in the table, six in the prose".
- Why it costs: the page's own pitch is "every number is sourced and dated … Check everything." A shop owner comparing Square terminals with WCPOS's is exactly the reader who checks. When the second list is shorter, the first one stops looking trustworthy, and a Windcave or Mercado Pago merchant who reads only the payments section thinks WCPOS can't take their reader.
- Fix: in all ten locales, make `compare.square.payments.wcpos` name the same eight terminals as the table cell, and phrase Vipps the same way the cell does ("…, Mercado Pago, PayArc and Windcave, plus Vipps MobilePay by QR code or push").
- Scope: ok (copy only; every name is already in the table on the same page and on /extensions). The same six-item list appears on the other comparison pages. Fix /compare/square first, because it is the only page that shows both lists.

## Worst defect — UI
- Page/viewport: /support, desktop and phone. The ask box on the first screen.
- Element: under the input, "Tick the box below to ask your question.", then three suggestion chips and "Answered by Aide · trained on the WCPOS docs & wiki", and only after those the Cloudflare "Verify you are human" box. That is about 170 px below the input on desktop and about 380 px below it on phone (`support-chat.tsx:320` renders `{turnstile.widget}` last, after the chips and `poweredBy`).
- Problem: the Ask button stays dimmed until the check is ticked. The hint points "below", but the next thing below is a row of chips that look clickable. On phone the check box sits near the bottom of the first screen, under the cookie bar's reach.
- Why it costs: a visitor types a question, presses a dead Ask button, and has to hunt for the check box. This is the one interactive feature of the support page. People who give up there go to Discord or the forum, or they leave.
- Fix: in `support-chat.tsx`, render `{turnstile.widget}` directly after the status line (the `form.interactive` / `form.verifying` text) and before the chips. The hint "Tick the box below" then points at the box right under it.
- Scope: ok (moves one element in one component; no copy change).

## Worst defect — SEO
- Page/viewport: /roadmap in all ten locales. This is metadata, so it applies at every viewport. The page is linked as "Roadmap" in the header nav of every page and is listed in the sitemap.
- Element: `<title>` "Roadmap | WCPOS" (`roadmap.meta.title`), meta description "See what we are building next for WCPOS — upcoming features, milestones, and release progress.", and the H1 "The release train" (`roadmap.page.title`). The other locales are just as bare: de "Produktplanung", nl "Routekaart", fr "Feuille de route", es "Hoja de ruta".
- Problem: since #891 fixed /changelog, /roadmap is the only page in the header nav whose title, H1 and description never say "WooCommerce", "POS" or the locale's head term. Its H1 is a metaphor that names neither the product nor the topic. The de and nl titles do not even say "Roadmap", which is the word people search for.
- Why it costs: the header nav sends internal link equity to /roadmap from every page, and that equity is spent on a title Google can only match to "WCPOS roadmap". Queries such as "WooCommerce POS roadmap", "WooCommerce POS tap to pay" and "WCPOS iOS app release" are the ones 2.0 users are typing now, while Tap to Pay and the store apps are still due. For those, the GitHub board ranks instead of wcpos.com, so the searcher never sees the site's nav to /downloads and /pro.
- Fix: set `roadmap.meta.title` to "WooCommerce POS Roadmap: What's Next" (the template adds "| WCPOS"; 44 characters in total). Set the description to "What's coming next for WCPOS, the point of sale for WooCommerce: features in progress and planned, pulled live from GitHub." Make the H1 "WooCommerce POS roadmap" and move "The release train" into the eyebrow. In the other locales, use the same head terms as #891 (de "WooCommerce-Kassensystem", nl "Kassasysteem voor WooCommerce", and so on).
- Scope: ok (metadata and heading copy only; no new claims; no feature or date is announced).

## Runner-up notes (max 3 lines)
- /downloads mobile Lighthouse is 94 with a 3.0 s LCP for the second round running (round 41: 99 and 1.8 s; /pro is 1.7 s). Two runs in a row is a pattern, not noise. Trace the LCP element before the next round.
- /downloads "What's new" ends "Full history on GitHub — Free · Desktop". The anchor text "Free" means nothing, and the page has no in-body link to the on-site /changelog. Point the plugin link at /changelog.
- `metadata.siteDescription` is still the stale fallback "Fast, reliable POS system for your WooCommerce store." in all ten locales (rounds 40 to 42).
