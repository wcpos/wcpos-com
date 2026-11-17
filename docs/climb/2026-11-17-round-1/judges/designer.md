# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point-of-sale for WooCommerce that turns a tablet at the counter into a register selling from the same catalogue, stock and prices as the online shop.
Why version 2: not answered

## Scores
| Track | Score |
|---|---|
| Marketing | 6 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: home (`/`), both viewports; the same on /nl and /de.
- Element: the hero lock-up, from "POINT OF SALE FOR WOOCOMMERCE" through "Your WooCommerce store, at the counter." to the proof row "5,000+ Active Stores · Free & Open Source · Since 2014". Nothing anywhere on the home page says "2.0" (I searched text/home.txt: no "2.0", no "version 2", no "new").
- Problem: The site's biggest news is that WCPOS 2.0 shipped on 9 Nov 2026, and the home page doesn't mention it. The only proof line next to the CTAs points backwards ("Since 2014"). A returning 1.x user or a shop owner comparing POS options can't tell that anything changed. The 2.0 story is buried in /compare/square ("Since 2.0, the free version also includes one register with an opening float, cash in and out, a count at close…") and in the version numbers on /downloads.
- Why it costs: The 10-second test fails on its second question. A launch week is when search, forum and Discord traffic arrives looking for "what's new", and the page shows those visitors a hero that could date from 2024. Visitors who don't see it is a new release won't read further or upgrade.
- Fix: Add a small linked announcement above the eyebrow (or in place of "Since 2014" in the proof row), e.g. "New: WCPOS 2.0 — registers, cash-up and split payments, free →", linking to /changelog. Use only the 2.0 facts the site already states, and translate it in messages/*.json.
- Scope: ok (released product, wording taken from existing site copy; it must not mention phone apps or Tap to Pay as part of 2.0)

## Worst defect — UI
- Page/viewport: /pro (also /nl/pro and /de/pro), both viewports. The same pattern sits under the /compare/* heroes.
- Element: the gap between the hero subtitle "Everything in the free POS, plus payment terminals, store management at the register, end-of-day reports, and priority support." and the "What's included in Pro?" heading.
- Problem: About 190 px of blank white on desktop and about 145 px on phone, between two sections on the same white background. The cause is the hero Section's `spacing="hero"` bottom padding (lg:py-28) stacking on the next Section's `compact` top padding (py-16/md:py-20) with no tone change to explain the gap. In shots/pro-desktop-fold.jpg the H1 floats alone and the price card ("$129 USD /yr") gets cut off by the fold. In the phone shots (pro, de-pro) the hero sits in empty space and the buy box doesn't start until roughly the third screen.
- Why it costs: Pro is the page that earns money, and its first screen has no price and no button. The gap breaks the visual link between the title and the offer, and on phone the extra scroll comes right where people decide whether to buy.
- Fix: Remove most of the hero's bottom padding on /pro, e.g. `className="pb-6 md:pb-8 lg:pb-10"` on the hero `<Section>` in `src/app/[locale]/(main)/pro/page.tsx`. Ideally also add a `hero-tight` spacing variant in `section.tsx` and use it on the compare heroes too.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /pro (all locales), the `<title>`.
- Element: "Pro - Premium Features | WCPOS" (nl "Pro - Premiumfuncties | WCPOS", de "Pro – Premium-Funktionen | WCPOS").
- Problem: The title of the page that earns the money has none of the words people search for ("WooCommerce", "POS", "card terminal", "Stripe Terminal") and starts with a generic "Pro - Premium Features". It also uses a hyphen in en/nl but an en dash in de. The meta description is good, so the title is the weak link.
- Why it costs: The title is the strongest on-page ranking signal and is the blue link people see in search results. "Premium Features" won't match queries like "WooCommerce POS card terminal" or "WooCommerce POS pro", and next to competitors' titles it doesn't tell searchers what the page offers.
- Fix: Change the metadata title to something like "WCPOS Pro: Card Terminals, Stock Editing & Reports for WooCommerce POS", with matching nl/de strings and one dash style across locales.
- Scope: ok

## Runner-up notes (max 3 lines)
- The home page renders the H1 and three H2s twice (the scroll-story and static variants are both in the DOM; facts.json lists the H1 "Your WooCommerce store, at the counter." twice). Keep only one in the accessibility tree.
- "WCPOS turns the tablet into your register" (en) and "verandert de tablet in je kassa" (nl): "the" reads as a specific tablet. de already uses "dein Tablet", so use "your tablet" / "je tablet".
- /downloads and /extensions have generic titles ("Downloads | WCPOS", "Extensions | WCPOS"); the extensions description is only 74 characters.
