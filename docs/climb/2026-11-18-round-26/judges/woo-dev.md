# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin for WooCommerce that turns a tablet into the register, selling from the store's own catalog, stock and prices, even offline.
Why version 2: In 2.0, opening and closing the register, split payments and today's sales are free. This comes from the "New in 2.0" line above the H1.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare/square, every viewport and locale, in the "At a glance" table. The same wording is on /compare/woocommerce-pos and /compare/foosales.
- Element: The Devices row reads "Web, desktop apps (Windows, macOS and Linux), iOS and Android apps (beta); unlimited devices and cashiers". The Price row in the same table reads "Free plugin with no caps; Pro is $129 …". The keys are `compare.square.glance.rows.devices.wcpos`, `compare.woocommerce.glance.rows.devices.wcpos` and `compare.foosales.glance.rows.devices.wcpos` ("Unlimited devices and cashiers").
- Problem: Free-versus-Pro is the first thing I check, and the table is the part of a comparison page I actually read. On these three spokes the WCPOS column says "unlimited devices" and "no caps" and never mentions that the free version runs one register. The site states that limit everywhere else: the home Free card says "One register", the /pro FAQ says "it runs one register", and the Vitepos and YITH tables say "One register in the free version; more registers and multi-store management in Pro; unlimited devices and cashiers". On /compare/square, "one register" appears only once, deep in the "What does it cost?" prose. Round 25 fixed the same contradiction on the Oliver page, but these three tables were left as they were.
- Why it costs: My client has two stores, so two counters. If I read only the Square table, I'd tell them the free version covers both and find out otherwise at install. A recommendation built on the site's own comparison table turns out wrong, and I stop trusting the rest of the table, including the competitor claims I'm supposed to rely on.
- Fix: In every locale, change the three Devices cells to the Vitepos/YITH wording, for example "Web, desktop apps (Windows, macOS and Linux), iOS and Android apps (beta); one register in the free version, more with Pro; unlimited devices and cashiers". Extend the round-25 test so that every spoke table that says "unlimited devices" also says "one register".
- Scope: ok. This only repeats the free-tier limit that the home page, /pro and four other spokes already state. No price or licence term changes.

## Worst defect — UI
- Page/viewport: /downloads, desktop 1440 and phone 390.
- Element: "Sync every till before upgrading: 2.0 starts a new local database and does not carry over unsent 1.11 sales. … The app and the plugin must both be on 2.0". It sits inside the 2.0.0 entry of "What's new", at the bottom of the release history.
- Problem: The hero download card has notes for Intel Macs and for macOS 12. It has none for the one case that loses data, an upgrade from 1.11. On desktop the warning is about 2,700 px below "Download for macOS", past "How it fits together" and "Three steps to your first sale". On phone it is several screens further down. Nothing in the fold points to it. This is the second round I'm naming it.
- Why it costs: My clients are on 1.11. A till with unsent offline sales loses them if the new app goes on first. The page gives the macOS 12 note more prominence than the warning that protects the store's sales.
- Fix: Add a third note in the same style under the download button: "Upgrading from 1.11? Sync every register first; unsent sales don't carry over. Read the 2.0 notes ↓". Link it to a new `id` on the release-history section, in every locale.
- Scope: ok. It restates the existing release note: one message key in each locale and one anchor.

## Worst defect — SEO
- Page/viewport: /pro, all locales. This is the `SoftwareApplication` JSON-LD in `src/app/[locale]/(main)/pro/pro-product-json-ld.tsx`.
- Element: `operatingSystem: 'Windows, macOS, Linux, iOS, Android'`. The object has no `softwareRequirements`.
- Problem: The shared builder used on home and /downloads (`src/lib/software-application-json-ld.ts`) declares "Windows, macOS, Linux, iOS, Android, Web" and `softwareRequirements: "WordPress 5.6+, WooCommerce 9.0+, PHP 7.4+"`. The /pro markup is a hand-written copy that has drifted from it. It leaves out Web, which is the platform the demo and the "One POS. Web, desktop…" section lead with. It also leaves out the WordPress and WooCommerce requirement, which is what defines a WooCommerce add-on. The page that carries the paid offers therefore has the least accurate product schema on the site.
- Why it costs: Rich results and AI answers for "WCPOS Pro requirements" or "WooCommerce POS web app" take their facts from the Offer page's schema. There, Pro looks like a native-only app with no stated platform. Search engines also get two different descriptions of the same product from two of the site's pages.
- Fix: Set `operatingSystem` on /pro to "Windows, macOS, Linux, iOS, Android, Web" and add the same `softwareRequirements` string. The cleanest way is to import both from the shared helper, plus a test that /pro and home agree.
- Scope: ok

## Runner-up notes (max 3 lines)
- The /downloads 2.0.0 release note prints a raw URL ("What's new: https://docs.wcpos.com/getting-started/whats-new"), although round 25 removed raw URLs from the Sources lists.
- Each of the 15 /extensions cards links with the same text, "Documentation", which is weak anchor text and gives screen-reader users no context. Use "Stripe Terminal docs" and so on.
- /compare/square on phone still has about 150 px of empty space between the lede and "The short answer". Lighthouse mobile fell on every page this round (/downloads 68, TBT 1.3 s), but round 25 scored 99, so I read that as a busy capture box rather than a regression.
