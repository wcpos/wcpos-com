# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin plus apps that turns a tablet into a register running off the WooCommerce store's own catalog, stock and prices, and it keeps selling offline.
Why version 2: In 2.0, opening and closing the register, split payments and today's sales are free (the "New in 2.0" line above the H1).

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, every viewport and locale (en, nl and de checked).
- Element: the card "Payment Terminal Integration — Connect card readers and payment terminals for fast, accurate in-person payments."
- Problem: This is still open from round 8. The /pro page sells Pro but names no terminal or processor, and it does not link to /extensions. /extensions is not in the header nav either. The list exists elsewhere on the site: /extensions shows Pro terminal extensions for Stripe, Square, SumUp, PayPal Reader, Mollie, PayArc, Mercado Pago, Windcave and Vipps MobilePay, each with a docs link. The home page names only "Stripe Terminal and SumUp". The /compare/square "Card payments" row lists six of these, not nine.
- Why it costs: Before I recommend a POS, I first check "does it work with the client's processor?" On the page with the buy button, the answer is a generic sentence. To find out whether a client's Mollie or Windcave account is covered, I have to search the footer or read a competitor comparison. A developer who can't answer that from the site either drops WCPOS from the shortlist or books the sales call this site is meant to make unnecessary.
- Fix: In the card, name the processors the site already lists ("Stripe, Square, SumUp, PayPal, Mollie, Windcave and more") and add a "See all terminal extensions →" link to /extensions under it, in every locale.
- Scope: ok. These are names already published on /extensions plus one internal link. No new claim, no price or licence wording.

## Worst defect — UI
- Page/viewport: /compare/square (and every /compare/* page that uses the same template), phone 390x844.
- Element: the fold is the H1 "WCPOS vs Square for WooCommerce", a six-line intro paragraph, and the "Who runs this comparison" card ("This page is published by kilbot, the maker of WCPOS…"). "The short answer" starts below the fold.
- Problem: On phone the first screen holds no comparison content at all: an intro, then a disclosure box about who wrote the page. The verdict ("every sale is a WooCommerce order, so there is nothing to sync… Pro adds multi-store management…") and the at-a-glance table start a full screen down. The cookie bar covers the bottom of the fold.
- Why it costs: These pages answer searches like "WCPOS vs Square". A developer who taps through from a result on their phone wants the verdict first. What they see first is a defensive note, so the page reads like a disclaimer and the bounce risk is highest exactly where the page should win the visit.
- Fix: Below `md`, render "The short answer" before the "Who runs this comparison" card. Alternatively, collapse the card to one line ("Published by the maker of WCPOS — every fact sourced and dated ›") that expands on tap. Keep the desktop order.
- Scope: ok. This changes the comparison template's order or styling only; the copy stays the same.

## Worst defect — SEO
- Page/viewport: /support, title tag (all viewports; the other locales mirror it).
- Element: `<title>Support | WCPOS</title>`
- Problem: Every other key page names WooCommerce POS in its title. Examples: "Download WooCommerce POS for Mac, Windows, Linux & Web | WCPOS" and "WooCommerce POS Extensions & Card Terminals | WCPOS". /support has a brand-only title, and its H1 "How can we help?" has no term in it either. The meta description is good, but nothing in the head says what product the page supports. This was named in round 8 too and is still open.
- Why it costs: Developers search "WooCommerce POS support", "WCPOS licence sites" or "WooCommerce POS barcode scanner help" before recommending a plugin. With this title the page has no chance of ranking for those, and in a tab or a SERP "Support | WCPOS" is indistinguishable from any vendor's help page.
- Fix: Set the title to "WooCommerce POS Support & Help | WCPOS" (localised the same way as the /downloads and /extensions titles).
- Scope: ok. Metadata only.

## Runner-up notes (max 3 lines)
- The /extensions phone layout gives every long name ("Mollie Terminal for WooCommerce") a "Pro" pill that wraps onto its own line in dark red on near-black. Free and Pro extensions are hard to tell apart when scanning 15 cards in one flat list.
- /compare/square says Pro adds "refunds at the register, the Coupons screen, a customer-facing display, store-specific pricing", but /pro, the page that sells Pro, lists none of these.
- /downloads says "Ring up a sale on the desktop, refund it on your phone", which reads as free and shipped, but refunds are Pro and the phone apps are beta.
