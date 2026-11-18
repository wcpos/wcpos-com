# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce. It turns a tablet into the shop's register and sells from the online store's own catalog, stock and prices, even offline.
Why version 2: The red "New in 2.0" line above the kicker says it on desktop and phone, in en, nl and de: in 2.0, opening and closing the register, split payments and today's sales are free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /downloads, desktop and phone, en. The other locales use the same keys.
- Element: the step 3 card "Unlock the full till" / "A licensed plugin that adds terminal payments, refunds and stock control on the same foundation." (`messages/en.json:1714-1715`). Also the H1 tagline "One till, every device." (`:1639`) and the H2 "One store at the centre. Every till in sync." (`:1649`).
- Problem: The only Pro nudge on the highest-intent page leaves out the 2.0 upsell, which is more registers and more stores. The 2.0.0 notes further down this page say "Free includes one register; more registers need Pro". /pro also leads with "More Registers & Multiple Stores". Meanwhile the tagline, an H2 and the Pro card title all say "till", while the home hero, /pro and the 2.0 notes say "register". The visitor meets two words for the same thing on one page.
- Why it costs: A shop owner who has just downloaded the free app is sold refunds and stock control instead of the reason they would actually pay, a second register or a second shop. The till/register switch makes the 2.0 story read as if it were written by two teams. This is the fourth round this has been named, and the capture is unchanged.
- Fix: Body: "A licensed plugin that adds more registers and stores, terminal payments and stock control on the same foundation." Card title: "Unlock the full register". Tagline: "One register, every device." H2: "One store at the centre. Every register in sync." Apply the same change to the locale keys.
- Scope: ok. This is copy only. Every feature named is already listed on /pro, and no price or term changes.

## Worst defect — UI
- Page/viewport: /extensions, phone (390). Ten cards are affected, including Mercado Pago, Mollie, PayArc, PayPal Reader, Square, Stripe, SumUp, Windcave, Email Invoice Gateway and Vipps MobilePay. On desktop, Windcave and Mercado Pago are affected.
- Element: the "Pro" chip after titles such as "Square Terminal for WooCommerce" and "Stripe Terminal for WooCommerce".
- Problem: The `<h3>` is `inline` and the Badge is an inline sibling with `ml-2` (`src/app/[locale]/(main)/extensions/page.tsx:111-121`). When the title fills its line, the chip drops onto a line of its own and keeps its 8 px indent. On phone, the payments group becomes a column of loose chips, each a few pixels in from the title edge. Only the short titles (Email Invoice Gateway, Vipps, ATUM) keep the chip inline, so the chip's position also changes from card to card.
- Why it costs: /extensions is where card-terminal searches land, and these are the paid add-ons. An orphaned, off-grid chip makes the page look unfinished, and it reads as a stray tag rather than "this needs Pro". I have named this for seven rounds, and #761 fixed the same pattern in `FeatureCard`.
- Fix: Change the wrapper to `flex flex-col items-start gap-1`, make the h3 `block`, and drop `ml-2` from the Badge, so the chip always sits flush left on its own line under the title.
- Scope: ok. This is styling in one page component.

## Worst defect — SEO
- Page/viewport: /downloads, and home, which shares the helper. All locales. The defect is in the JSON-LD.
- Element: the `SoftwareApplication` from `wcposSoftwareApplication()` (`src/lib/software-application-json-ld.ts`). It has only name, category, operatingSystem, url, image and a $0 offer, while the page shows "Version 2.0.4" and "Latest 2.0.4 · WordPress 5.6+ · WooCommerce 9.0+ · PHP 7.4+".
- Problem: The page has just been rebuilt around the 2.0 release (version line, requirements, release history), but none of that is machine-readable. There is no `softwareVersion`, `softwareRequirements`, `datePublished`/`dateModified` or `releaseNotes`. The "WooCommerce 9.0+" fixed last round in the visible copy exists only as text.
- Why it costs: "WooCommerce POS download" and "WCPOS 2.0" are the queries this page should own. Without a version and requirements in the structured data, search and AI answer engines fall back to older third-party listings (WordPress.org mirrors and reviews of 1.x), which can serve the old version or wrong requirements to someone about to install.
- Fix: On /downloads, pass `{ softwareVersion: <latest plugin version already fetched for the page>, softwareRequirements: 'WordPress 5.6+, WooCommerce 9.0+, PHP 7.4+', releaseNotes: 'https://wcpos.com/downloads#whats-new' }` into `wcposSoftwareApplication()`. Reuse the strings the step 1 line already renders.
- Scope: ok. These are metadata fields drawn from facts the page already shows.

## Runner-up notes (max 3 lines)
- /downloads "What's new" 2.0.0: it still opens with two bold warnings ("cashiers will need time…", "Sync every till before upgrading…") before the feature list. Normal weight, or a callout box, would let the features lead.
- Home phone trust row: "Since 2014" drops alone onto a second centred line under "5,000+ Active Stores · Free & Open Source" in en and de. A `gap-x` tweak or a 2+1 grid would steady it. /support phone chips still look disabled (40% grey) while "Running a quick security check…" shows.
- /pro desktop H1 "WCPOS Pro for WooCommerce POS" says POS twice. de/nl read better ("WCPOS Pro – Kassensystem für WooCommerce"); "WCPOS Pro: point of sale for WooCommerce" would match them.
