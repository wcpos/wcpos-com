# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: It's a free till for my WooCommerce shop that runs on a tablet and uses the same products, stock and prices as my website, even when the internet drops.
Why version 2: In 2.0 I get opening and closing the register, split payments and today's sales for free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /downloads, desktop and phone. This is where the home page's "Download Free" button (hero and closing band) and /pro's "Try the free version first" link both land.
- Element: The first screen is "One till, every device." with a pre-selected "macOS · Detected · Version 2.0.4 · Apple Silicon · .dmg" card and a big red "Download for macOS" button. The line "Every app connects to the free WordPress plugin — install it first." comes only *after* that card. On phone it is below the first screen, and the plugin itself is step 1 of "Three steps to your first sale", much further down.
- Problem: I clicked "Download Free" to try the free thing. The page's main action is a desktop app, and that app does nothing until the WordPress plugin is installed. The right first step comes after the wrong one. On phone I can't see it until I scroll past the macOS button.
- Why it costs: I'm not technical and I'm trying three products this week. If I download a .dmg, open it and get asked for a store URL that doesn't work yet, I give up and go back to Square, whose app just works. This is the conversion step for every "Download Free" click, and it sets up the first experience to fail.
- Fix: Put the plugin step first in the /downloads hero, above the device picker. Use one line, "Step 1: install the free WCPOS plugin on your WooCommerce site", with WordPress.org and .zip links, then "Step 2: pick your device". Or link the home "Download Free" to the plugin step (`/downloads#plugin`). Both reuse copy and links already on the page.
- Scope: ok

## Worst defect — UI
- Page/viewport: home (/), phone 390 px, the "Synced with WooCommerce. Yours, even offline." section.
- Element: The status chips around the Woo cloud illustration. "orders → Woo ●" runs off the right edge of the screen and loses its right border and green dot. "1,204 products ● synced" and "works offline ●" sit fully inside the screen.
- Problem: One of three labels is visibly cropped by the viewport. It looks broken next to its two neighbours, in the section that sells the "your data, synced" promise. The facts capture lists absolutely positioned elements past the right edge on home, hidden by overflow clipping rather than laid out inside the screen.
- Why it costs: A cut-off label in the middle of the page makes the site look unfinished on the phone, which is the device a market-stall seller is most likely browsing on. That hurts the "will this be reliable at my stall?" judgement.
- Fix: On small screens, pull the right-hand chips inside the container (for example `right-2`/`max-w-[calc(100%-1rem)]` below `sm`) so every chip sits fully on screen.
- Scope: ok. This is the chip position only, not the scroll-story's weight, which is blocked. It touches the same component as the owner's open PR, so it should be checked against that PR.

## Worst defect — SEO
- Page/viewport: home (/), all locales, meta description (facts.json).
- Element: "Free, open-source point of sale for WooCommerce. Sell offline, split payments, and open and close your register — all free in WCPOS 2.0. Web and desktop apps; iOS and Android apps in beta." That is 188 characters in English, 197 in nl and 216 in de.
- Problem: The site's most important page has the longest description, about 30–60 characters past what a search result shows. Google cuts it off around "Web and desktop apps; iOS a…". That drops the beta caveat that round 6 added, which half-says the opposite of what it means. The /compare descriptions were trimmed to ≤155/160 last round, but the home one wasn't.
- Why it costs: The search snippet is the first thing I'd read when I google "WooCommerce POS". A truncated snippet looks careless and hides which apps are ready, and the de and nl versions are cut even earlier.
- Fix: Rewrite `home` meta descriptions to ≤155 characters (de–pt ≤160, ja/ko/zh ≤100), as #730 did for /compare. Example: "Free, open-source WooCommerce POS. 2.0 adds register open/close, split payments and offline sales. Web and desktop; iOS and Android in beta." (≈145).
- Scope: ok

## Runner-up notes (max 3 lines)
- Compare is still only in the footer. Neither the home body nor the header points me to /compare/square or /compare/foosales, the exact pages for my shortlist. A home-body link ("Comparing Square or FooSales? See side by side →") avoids the nav decision.
- /pro still never sells "more registers / more than one store", but its own FAQ now says "more registers … need Pro".
- On the home page the "Pro" badge on "Reports across days, registers & stores" wraps onto its own orphaned line at 390 px.
