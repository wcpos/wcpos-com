# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin for WooCommerce, with apps, that turns a tablet into the register and sells from the store's own catalog, stock and prices, even offline.
Why version 2: 2.0 makes opening and closing the register, split payments and today's sales report free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /downloads, all viewports and locales. Step 1 "Install the free plugin", the requirements line under the WCPOS plugin card.
- Element: "Latest 2.0.4 · WordPress 5.6+ · WooCommerce 5.3+ · PHP 7.4+". Further down the same page, the 2.0.0 release notes say: "WCPOS 2.0 needs WooCommerce 9.0 or later."
- Problem: The headline requirements line is wrong for the version it names. The plugin itself declares `WC requires at least: 9.0` (`woocommerce-pos.php` header), and the page's own release notes say 9.0. The step-1 line still says 5.3+. It is hard-coded in `messages/*.json` (`downloads.page.steps.plugin.requirements` and `requirementsWithVersion`, all 10 locales), so it never followed the 2.0 bump.
- Why it costs: Before recommending a plugin, the first thing I check is the compatibility line, and I check it against the client's stack. A client on WooCommerce 6–8 reads "5.3+" and installs 2.0 on the live store, and the plugin refuses to run. When the site contradicts itself on a requirement, I stop trusting its other claims, such as offline, multi-store and terminals, and go and read the code instead. It's the most visible fact for a developer, on the page where the install happens.
- Fix: In every locale, change "WooCommerce 5.3+" to "WooCommerce 9.0+" in both `requirements` and `requirementsWithVersion`. WordPress 5.6+ and PHP 7.4+ match the plugin header and stay.
- Scope: ok

## Worst defect — UI
- Page/viewport: /support, phone 390. It shows in the phone fold, and on desktop until Turnstile completes. Still present from round 20.
- Element: The placeholder is cut off before the "Ask" button: "e.g. How do I connect a receipt printe". The pink "Ask" button and the three chips ("How many sites can I use my licence on?" and the other two) are faded. The "Verify you are human" Cloudflare box is the last thing on the page, below "Answered by Aide · trained on the WCPOS docs & wiki".
- Problem: While `verifying`, the chips and the submit button are disabled (`support-chat.tsx`). The widget that unlocks them is rendered after the credit line, and no text connects the two. The first screen shows a clipped input and controls that look broken and don't respond to a tap.
- Why it costs: I judge a project's care by its support page. The chip I'd tap first, the licence question, does nothing, and nothing tells me to tick the box below. It reads as a broken help desk on a product I'm about to vouch for to a client.
- Fix: Render the Turnstile widget directly under the input, or show one line above the chips while verifying ("Tick 'Verify you are human' below to ask"). Shorten the placeholder so it fits at 390 px, for example "e.g. Connect a receipt printer".
- Scope: ok

## Worst defect — SEO
- Page/viewport: /downloads, all locales. The `SoftwareApplication` JSON-LD (`wcposSoftwareApplication` in `src/lib/software-application-json-ld.ts`, called from `downloads/page.tsx`).
- Element: `{"@type":"SoftwareApplication","name":"WCPOS","operatingSystem":"Windows, macOS, Linux, iOS, Android","offers":{"price":"0"},"url":…,"description":…}`. It has no `softwareVersion` and no `softwareRequirements`.
- Problem: The page already fetches the release (`freeVersion`, shown as "Latest 2.0.4") and prints the requirements. The one machine-readable entity for the product still doesn't say which version is current or that it needs WordPress, WooCommerce and PHP. `operatingSystem` also leaves out the Web app the page offers.
- Why it costs: Developers search "WooCommerce POS requirements" and "WCPOS latest version", and AI answer tools and rich results read exactly these fields. The page that answers both questions gives the crawler neither. Once the step-1 line is corrected, the structured data should carry the same corrected fact.
- Fix: On /downloads, pass `softwareVersion: freeVersion` (when present) and `softwareRequirements: "WordPress 5.6+, WooCommerce 9.0+, PHP 7.4+"` in `extra`. Add "Web" to `operatingSystem`.
- Scope: ok

## Runner-up notes (max 3 lines)
- /pro multi-store (front desk, since round 13): the card still never says whether a "store" is a location inside one WooCommerce site or a separate install. Next to "2 sites = live + dev", it reads as two licences for my two-store client.
- "Till" is still on the en site: /downloads ("One till, every device.", "One store at the centre. Every till in sync.", "Unlock the full till") and the /pro customer-display card ("pair it to a till"). The rest of the site says "register".
- Home "Bring your own hardware" names printers and scanners but links no docs. One link to the printer/hardware docs page would answer the hardware question without a support ticket.
