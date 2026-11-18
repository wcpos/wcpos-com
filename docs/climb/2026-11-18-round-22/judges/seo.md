# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce that turns a tablet into the store's register and sells from the same catalog, stock and prices, even offline.
Why version 2: The "New in 2.0" line above the H1 says that opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: `/downloads`, desktop and phone, all locales. This is step 3 of "Three steps to your first sale" (`messages/en.json`, `downloads.*.pro.*`). The same file has the tagline "One till, every device." at `messages/en.json:1639`.
- Element: "Want more? Go Pro — A licensed plugin that adds terminal payments, refunds and stock control on the same foundation." The card under it reads "Unlock the full till — Terminal payments, refunds, stock & pricing, order management, full reports, multi-store and priority Discord support."
- Problem: This is still live and is the fourth round it has been named; it was deferred in round 21. It is the only Pro pitch on the page with the highest intent after home, and it leaves out the main reason to upgrade. Free is "one register", and both /pro and home list "More Registers & Multiple Stores" first. Here "more registers" is missing and "multi-store" comes sixth. The card title, the H1 tagline and the H2 ("Every till in sync") all say "till", while every other page says "register".
- Why it costs: An owner who downloads for a second counter or a second shop is not told, at the moment of download, that Pro covers it. "Till" also reads as foreign to US owners, and it pulls the page away from the "WooCommerce POS register" wording the rest of the site uses.
- Fix: Lead with the existing /pro claim: "A licensed plugin that adds more registers and stores, terminal payments and stock control on the same foundation." Retitle the card with each locale's existing "More Registers & Multiple Stores" string. Swap "till" for "register" in the tagline and the H2.
- Scope: ok. This reorders and rewords claims /pro already makes. Prices and plan terms are untouched.

## Worst defect — UI
- Page/viewport: `/support` on phone (390 px), `support-phone-fold.jpg`.
- Element: The new status line reads "Running a quick security check…", directly above three chips drawn at very low contrast ("How many sites can I use my licence on?" …) and a pale "Ask" button. Further down sits Cloudflare's unticked "Verify you are human" checkbox.
- Problem: Round 21's fix (#793) solved the clipped placeholder, but when Turnstile falls back to its interactive challenge, the line tells the visitor to wait for a check that is actually waiting for them. The checkbox is the last thing in the fold, below the faded chips, so nothing links the dead-looking controls to the box that turns them on. The round 21 record deferred this.
- Why it costs: /support is where a stuck owner lands from the nav and from "WooCommerce POS help" searches. If the controls look disabled and the page says "wait", some visitors leave for the forum or Discord without ever ticking the box, and the instant answer, which is the page's whole content, goes unused.
- Fix: Have the Turnstile hook expose its `interacting` state. While it is true, change the line to "Tick the box below to ask" (localised) and show it next to the checkbox.
- Scope: ok. This touches one hook and one component's copy, with no new page.

## Worst defect — SEO
- Page/viewport: Home on every locale (`/`, `/de`, `/nl` …) and `/downloads`, both viewports. The source is `src/lib/software-application-json-ld.ts`, called from `src/app/[locale]/(main)/page.tsx:71` and `downloads/page.tsx:181`.
- Element: `{"@type":"SoftwareApplication","name":"WCPOS","operatingSystem":"Windows, macOS, Linux, iOS, Android","offers":{…},"downloadUrl":…}`. It has no `softwareVersion`, `softwareRequirements` or `releaseNotes`. The same page shows "Version 2.0.4", "Latest 2.0.4 · WordPress 5.6+ · WooCommerce 9.0+ · PHP 7.4+" and a "What's new" list.
- Problem: The release that the whole site is built around (2.0, 9 Nov 2026) appears nowhere in the site's main entity markup. Google, Bing and AI answer engines see a version-less "WCPOS", so for "WooCommerce POS 2.0" or "WCPOS latest version" they have to scrape the version from body text. They also can't tell from the markup that 2.0 needs WooCommerce 9.0, the requirement round 21 just corrected in the copy. The woo-dev judge raised this in round 21 and it was deferred, not blocked.
- Why it costs: Entity facts in structured data feed the knowledge panel and AI-answer snippets for "WooCommerce POS" queries. Right after a major release, an answer engine that quotes an old version or the old WooCommerce 5.3 requirement from a cached third-party page sends shop owners to the wrong install path, and the site has the correct data but doesn't publish it as markup.
- Fix: On `/downloads`, where `getReleases('woocommerce-pos')` already runs, pass `softwareVersion: newest.version`, `softwareRequirements: "WordPress 5.6+, WooCommerce 9.0+, PHP 7.4+"` (the same constants step 1 renders) and `releaseNotes: localeUrl(locale, '/changelog')` into `wcposSoftwareApplication`. When the page falls back to `FALLBACK_RELEASES` (1.9.6), leave `softwareVersion` out so the markup never states a stale version.
- Scope: ok. This is markup only, using values the page already displays.

## Runner-up notes (max 3 lines)
- The /compare hub meta description is about 162 characters, so Google cuts it at "…and when to choose each", and it names no competitor while the page's H2s name seven. Leading with "Square, FooSales, Oliver POS…" would match "X vs WooCommerce POS" queries.
- The en /support chip says "licence" while /pro and checkout say "license". The /support H1 leaves "& support" orphaned on its own line at 390 px.
- The nl and de /pro titles are 62 characters ("Pro-functies & prijzen – Kassasysteem voor WooCommerce | WCPOS"), so the brand suffix is at risk of truncation. Dropping " | WCPOS" or "– " would keep them under 60.
