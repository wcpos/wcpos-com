# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source register that runs your WooCommerce store's catalog, stock and prices on a tablet, phone or computer, with a paid Pro add-on.
Why version 2: Register open and close, split payments and today's sales are now free. It reads as a feature caption, not a reason to switch from Square or FooSales, and it gives no release date.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: /compare/square, both viewports ("How do card payments work?" section). The same six-item list also appears in the other comparison pages' prose and FAQs (messages/en.json lines 2160, 2294, 2635, 2742, 2769, 2884).
- Element: "With Pro, … add card-terminal integrations for Stripe Terminal, SumUp, PayPal Reader (Zettle), Square Terminal, Mollie Terminal, and Vipps MobilePay, installable one-click from the extension catalog."
- Problem: The "At a glance" table on the same page lists eight Pro terminals plus Vipps: Stripe Terminal, SumUp, PayPal Reader (Zettle), Square Terminal, Mollie Terminal, Mercado Pago, PayArc and Windcave. /extensions lists all eight too. The prose a few screens down names six and drops Mercado Pago, PayArc and Windcave. It also has no "and more" or "including", so it reads as the complete list.
- Why it costs: The page promises "every number is sourced and dated … Check everything". A sceptic who checks finds the page disagrees with itself about what Pro supports. That undermines trust in the Square facts as well. A buyer with a Windcave or Mercado Pago terminal reading the prose concludes that WCPOS doesn't support it, and that is the deciding question for a terminal owner.
- Fix: Make the prose list in `compare.square` (the `wcpos` card-payments body, en.json ~2443) match the table's eight terminals plus Vipps, in all locales. Better still, use one shared list for the comparison pages.
- Scope: ok (the product claims already appear on the same page and on /extensions; nothing new)

## Worst defect — UI
- Page/viewport: /support, phone (390), also desktop
- Element: "Tick the box below to ask your question." under the input, then three faded suggestion chips and "Answered by Aide · trained on the WCPOS docs & wiki", and only then the Cloudflare "Verify you are human" box (about 350 px lower on phone)
- Problem: The instruction points to a checkbox that sits below three chips and a credit line. The chips and the dim "Ask" button look disabled until the box is ticked. On phone the first screen shows a greyed-out form, and the one control that unlocks it sits at the bottom edge of the fold, under the cookie bar.
- Why it costs: The visitor types a question, sees a dead "Ask" button and faded chips, and has to hunt for the gate. A support page that looks broken is a poor first sign of the "Priority support" that Pro sells.
- Fix: Render the Turnstile widget directly under the input, where the instruction already points. Put the chips and the "Answered by Aide" line after it.
- Scope: ok (one component's layout order)

## Worst defect — SEO
- Page/viewport: /downloads, Lighthouse mobile
- Element: Mobile performance 94 with LCP 3.0 s (FCP 1.2 s, render-blocking savings of 230 ms). Every other page except / and /de scores 100 with an LCP of 1.7–1.8 s.
- Problem: This is the second round in a row at 3.0 s (round 42 also measured 3.0 s), so it is not run-to-run noise. A likely cause, which I could not confirm from the capture because the LCP element is not recorded: `DownloadsHero` (src/components/downloads/download-hero.tsx) server-renders the macOS panel (`getServerSnapshot` → 'mac-arm'). Lighthouse's Android user agent then swaps the panel to Android after hydration, so the largest text block is painted again late and becomes the LCP.
- Why it costs: /downloads is the page that converts ("Download WooCommerce POS"). Its LCP is in Core Web Vitals' "needs improvement" band on mobile, where most visitors who are shop owners comparing options arrive.
- Fix: Record the LCP element in the next Lighthouse run. If it is the platform panel, choose the platform on the server from the request's User-Agent (or keep the panel's size and text stable across the swap) so that no new LCP candidate appears after hydration.
- Scope: ok (one component; confirm the LCP element first)

## Runner-up notes (max 3 lines)
- /compare/square "What Square for WooCommerce doesn't do" still says "As verified on 2026-10-06" while the header and footer say "checked again 2026-11-18". The /compare/woocommerce intro (en.json 2307) has the same stale date.
- /compare/square table: "unlimited devices and cashiers, one register in the free version" reads as a contradiction to a buyer. Say what a "register" is in a few words.
- Home lists Web, Windows, macOS, iOS and Android. /downloads, /compare and the footer add Linux. Either the home device row or the other pages are incomplete.
