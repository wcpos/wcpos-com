# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free, open-source app that turns my tablet into the till for my WooCommerce shop, using the same products, stock and prices, and it keeps working when the internet drops.
Why version 2: 2.0 makes opening and closing the register, split payments and today's sales free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /downloads, both viewports. This is the Web option in the hero platform picker, and the Web row in step 2, "Pick your device".
- Element: In the hero, the Web tab says "No install needed" and has one button, "Open the web demo" (`downloads.platforms.web.action`). Step 2 says "Web — Open the live demo" (`downloads.page.steps.device.webCta`). Both go to demo.wcpos.com. The page meta still promises "the free WordPress plugin, the web app, and desktop apps".
- Problem: I need a till for the counter and another for the weekend market stall. The iOS and Android apps are marked "Beta", so the obvious answer is a phone browser. The Web option only ever takes me to the public demo. Nothing on the page tells me how I open the web register on my own shop after installing the plugin. Every other platform in the same picker gives me something for my own store, such as a .dmg, an installer or TestFlight. Web is the one that sends me to someone else's store.
- Why it costs: To a non-technical skimmer, "web app = demo" means "there's no real web version". That rules WCPOS out for the stall before I install anything, and Square, with its phone app, wins on that one point. It is also the cheapest way into WCPOS, and right now nothing on the site points to it.
- Fix: Under the Web button in both places, add one line that links the existing setup guide: "Using your own store? After installing the plugin, follow the setup guide →" (docs.wcpos.com/getting-started/installation). Add it to all ten locales.
- Scope: ok (one link and one line of copy that point to existing docs; no new product claim)

## Worst defect — UI
- Page/viewport: /extensions, phone 390x844 (the same in de and nl)
- Element: The hero, "Extensions for WooCommerce POS" … "Extensions marked Pro need WCPOS Pro.", uses `<Section spacing="hero">` (`extensions/page.tsx:68`, `py-20` on phone). It is followed by `<Section spacing="default">` (`py-16`) for "Card terminals and payments".
- Problem: About 80 px of empty space sits above the H1. About 145 px more sits between the last hero line and the "Card terminals and payments" heading (80 px from the bottom of the hero plus 64 px from the top of the next section). The first screen ends on the title of the first card, "Mercado Pago Terminal for WooCommerce", with the cookie bar over it. Not one terminal card is visible in full. Round 29 fixed this exact pattern on /pro (#826), and round 28 fixed it on /compare (#823). /extensions still uses the full hero padding.
- Why it costs: I open this page on my phone with one question: "will my card reader work?" About a quarter of the first screen is blank, and I have to scroll before I see a single complete answer. The other pages I've looked at get to the point faster, so this one feels slower and less finished.
- Fix: Give the /extensions hero the /pro phone padding (`spacing="none"` with `pt-10 pb-6 sm:pt-20 sm:pb-8 md:pt-24 md:pb-10 lg:pt-28`), and trim the next section's phone top padding to `pt-8`. Leave the desktop padding unchanged.
- Scope: ok (padding on one page at one breakpoint; no copy changes)

## Worst defect — SEO
- Page/viewport: The home page in de, fr and pt: the meta description, which is the search snippet
- Element: de: "Kostenloses Kassensystem für WooCommerce. Verkaufe offline, teile Zahlungen auf, öffne und schließe die Kasse. Web- und Desktop-Apps; iOS und Android in Beta." fr: "Point de vente WooCommerce gratuit. Vendez hors ligne, … ouvrez et clôturez la caisse. …" pt: "Ponto de venda gratuito para WooCommerce. … abra e feche a sua caixa. …" (`home.meta.description` in `messages/{de,fr,pt}.json`)
- Problem: The en, nl, es, it, ja, zh and ko descriptions all say the register features are "free in 2.0". de, fr and pt drop "2.0", and de and fr also drop "open source". In those three markets the snippet gives no hint that a new major version came out on 9 Nov, and the home fold's one "why now" message ("Neu in 2.0") never reaches the search results page.
- Why it costs: A searcher in Germany, France or Portugal comparing WCPOS with Square sees a generic "free POS" snippet next to competitors' feature snippets, with no reason to click now. These three are large WooCommerce markets, and the hook already works in the other seven locales.
- Fix: Rewrite the three descriptions to match en and stay at 160 characters or fewer. For de: "Kostenlose Open-Source-Kasse für WooCommerce. Neu in 2.0: Kasse öffnen und schließen, Zahlungen aufteilen. Offline verkaufen. Web, Desktop; iOS/Android in Beta." (160 characters). Write fr and pt the same way.
- Scope: ok (copy in metadata only; it repeats a fact the page already states)

## Runner-up notes (max 3 lines)
- /extensions lists terminals alphabetically, so Square Terminal is fifth and Stripe Terminal sixth, under Mercado Pago, Mollie, PayArc and PayPal. Square is on my shortlist and I scrolled about 2,000 px to find it.
- /compare/square on phone: the first button comes at "Which should you choose?", roughly 7,500 px down. A "Try Live Demo" link after "The short answer" would catch readers who are already convinced.
- The home testimonial cards on phone each open with an icon band about 110 px tall that holds only a small icon, so the three cards take about 1,300 px.
