# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale that turns your tablet, phone or computer into a register for your WooCommerce store, selling from the same catalog, stock and prices, even offline.
Why version 2: The red "New in 2.0" line says you can now open and close the register, split payments and see today's sales for free. The answer is there, but at body size above the kicker it still reads as a caption, not news.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare/square, desktop and phone, "How do card payments work?" (`text/compare-square.txt:50` against the "At a glance" row at `:36`). The same split appears on every /compare/<x> page.
- Element: The table row "Card payments" says "Pro terminal integrations: Stripe Terminal, SumUp, PayPal Reader (Zettle), Square Terminal, Mollie Terminal, Mercado Pago, PayArc, Windcave; Vipps MobilePay…". Two screens lower, the prose says "add card-terminal integrations for Stripe Terminal, SumUp, PayPal Reader (Zettle), Square Terminal, Mollie Terminal, and Vipps MobilePay, installable one-click from the extension catalog."
- Problem: The same page gives two lists of what Pro connects to. The table names eight terminals plus Vipps, while the prose that explains them names five plus Vipps. Mercado Pago, PayArc and Windcave drop out, even though /extensions shows them as Pro cards. In `messages/en.json` all seven `compare.*.glance.rows.*` cells carry the long list. The prose and FAQ answers carry the short one: `compare.square.payments.wcpos`, `compare.woocommerce.payments.wcpos`, `compare.woocommerce.faq.tapToPay.answer`, `compare.oliver.claims.payments.response`, `compare.{jovvie,vitepos,yith}.choose.wcpos.body`, and `compare.{jovvie,foosales,vitepos,yith}.faq.*.answer`.
- Why it costs: These pages sell on care. The hub's disclosure says "every number is sourced and dated … Check everything." A reader who checks finds that the page disagrees with itself on the exact point a terminal shopper came for, "does it work with my reader?". A shop owner in Latin America, the US or NZ who reads only the prose concludes that their Mercado Pago, PayArc or Windcave terminal is not supported. The FAQ answers also ship in FAQPage JSON-LD, so search snippets carry the short list as well.
- Fix: In each prose and FAQ string above, name the same terminals as the glance row of that page, adding "Mercado Pago, PayArc, Windcave" before "and Vipps MobilePay", in all ten locales. Do /compare/square first if one spec must stay small.
- Scope: ok. The change aligns copy to a list the page already states, with no new claim, number or price wording.

## Worst defect — UI
- Page/viewport: /support, desktop and phone, the ask form (`src/components/support/support-chat.tsx:274-320`). This was deferred from round 42 and is unchanged.
- Element: "Tick the box below to ask your question." → three faded chips ("How many sites can I use my licence on?" …) → "Answered by Aide · trained on the WCPOS docs & wiki" → the Cloudflare "Verify you are human" box.
- Problem: The hint points at a box three rows down, under the small print. Until the box is ticked, the chips and the Ask button are dimmed, so the first view of the form looks switched off. In both captures this round, the widget (`{turnstile.widget}`, line 320, no margin class) sits flush against the credit line with 0 px gap. Every other block in the form is spaced `mt-2`/`mt-4`, so the widget looks bolted on rather than part of the form.
- Why it costs: /support is where people land when something is already wrong. A form that looks disabled, with its unlock below the fine print, reads as broken. The suggested questions are the fastest route to an answer, and they are the part that looks dead. Some visitors go to Discord or leave.
- Fix: Render `{turnstile.widget}` directly under the form, before the "Tick the box below…" status line, as a centred block with `mt-3` and a reserved `min-h-[65px]`. The hint then points at the box right under it, and the chips and credit line follow.
- Scope: ok. One element moves and one class is added in one component, with no copy change.

## Worst defect — SEO
- Page/viewport: /downloads, Lighthouse mobile (`lighthouse.json` "/downloads mobile").
- Element: Performance 94, LCP 3.0 s, FCP 1.2 s, "render-blocking-insight … 230 ms". Round 41 measured 99 and 1.8 s. Round 42 measured 94 and 3.0 s and said to watch it before acting.
- Problem: This is the second run in a row at 3.0 s, so it is not noise. It is past the 2.5 s "good" Core Web Vitals line, on the site's highest-intent page, and /downloads is the only measured page in that state outside the blocked / and /de. The likely cause is in the source. `DownloadsHero` (`src/components/downloads/download-hero.tsx:33-42`) is a client component whose `useSyncExternalStore` server snapshot is `'mac-arm'`. On a phone or Android UA, hydration swaps the whole card, including its name, meta line, notice and buttons, so the largest text paints only after JS runs. This is an inference from the code and not measured: the capture has no LCP-element field.
- Why it costs: Mobile LCP is a ranking input, and a 1.8 s gap between FCP and LCP is the visible card changing under the visitor's thumb. A real iPhone or Android visitor sees "macOS" with a "Download for macOS" button flip to their platform after load.
- Fix: Read the LCP element in a local Lighthouse mobile trace of /downloads. If it is in the hero card, stop the hydration swap: render a platform-neutral card on the server and on the first client paint, and change only the badge and button after detection. Alternatively, pass the detected platform from the request User-Agent.
- Scope: ok. The change is contained to one component, with no copy, price or claim change.

## Runner-up notes (max 3 lines)
- /support, desktop and phone: the H1 still splits "WooCommerce / POS help & support", separating the head term. A no-break space between "WooCommerce" and "POS" in `support.page.title` keeps it whole.
- /downloads phone fold: the primary "Download for macOS" button sits below the fold, under the outline plugin button and a three-line 1.11 upgrade note. Shortening the note to one line, with a link to the guide, would lift the button into view.
- /extensions: the Stripe and Square cards ("Adds Stripe Terminal support to WooCommerce for in-person payments.") stay generic beside Mercado Pago's specific line. The copy comes from the catalog repo, so it is not a fix here.
