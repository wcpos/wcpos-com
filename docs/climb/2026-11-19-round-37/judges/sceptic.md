# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: a free, open-source point-of-sale plugin that turns a tablet into a register for your existing WooCommerce store, using the same catalog, stock and prices, and it keeps working offline.
Why version 2: the strip above the eyebrow says 2.0 makes opening and closing the register, split payments and today's sales free. It is answered, but it reads as catch-up on features Square and FooSales already ship rather than a reason to switch.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: home hero (desktop and phone fold), the same claim on /pro under the price card, and every locale (de "5.000+ aktive Geschäfte", nl "5.000+ actieve winkels", and the others).
- Element: "5,000+ Active Stores" (hero proof row, `messages/en.json` home `b1`) and "5,000+ active stores" (/pro, `proof`). The /compare/oliver-pos response says "5,000+ active stores run WCPOS according to WordPress.org".
- Problem: WordPress.org counts active installations, not stores, and the site says so itself. The home stats band further down reads "5,000+ Active Installations", and the compare "at a glance" rows read "5,000+ active installs". A Pro license covers "one live site and one development site", so installs include staging sites. "Stores" inflates the only number in the hero, and the Oliver line credits WordPress.org with a figure it does not publish.
- Why it costs: a buyer comparing POS options checks the wordpress.org plugin page first. If the first number they verify was inflated, they also discount the compare pages' "every number is sourced and dated, check everything" promise, which is WCPOS's strongest asset against Square, FooSales and Oliver. The home page contradicts itself about 40 lines below the fold, so even a reader who never leaves the site can spot it.
- Fix: say "5,000+ active installs" in the hero `b1`, the /pro `proof` and the Oliver response ("5,000+ active installs on WordPress.org"), with the same wording in all 10 locales.
- Scope: ok (copy only; the number itself does not change)

## Worst defect — UI
- Page/viewport: /compare/square, phone (390 px), the "At a glance" table. The same stacked-table component is used on the other compare pages.
- Element: the column label "Square POS + Square for WooCommerce", which wraps to two lines and repeats in each of the 9 stacked rows, next to "WCPOS".
- Problem: on phone each glance row stacks the two columns and prints both full column labels. The Square label takes two lines every time, so the table runs about 3,000 px of scroll. About a fifth of that is the same label repeated 9 times, and the actual cell values (one-line answers such as "No country restriction" and "$0/month per location") get lost between them. This was first deferred in round 33 and is still in this round's capture.
- Why it costs: the glance table is where a sceptical buyer decides whether to read any further. On phone they have to scroll through repeated boilerplate to compare two short answers, and the head-to-head stops reading at a glance.
- Fix: in the stacked phone layout, print a short column label ("Square" / "WCPOS") in each row and keep the full "Square POS + Square for WooCommerce" header only on the desktop table, or print it once above the stack.
- Scope: ok (styling and label change on one component)

## Worst defect — SEO
- Page/viewport: /downloads, mobile Lighthouse.
- Element: the platform hero card ("macOS · Detected · Version 2.0.4 · Apple Silicon · .dmg / Download for macOS"), rendered by `DownloadsHero` with server snapshot `'mac-arm'`.
- Problem: /downloads scores 88 for mobile performance, with LCP 3.5 s (audit score 0.65, failing) and speed index 4.4 s, against FCP 1.5 s. It is the worst result among the pages that are not blocked. The likely cause is that the server HTML always renders the macOS card. On a phone user agent (Lighthouse mobile, and real iPhone and Android visitors), `useSyncExternalStore` then swaps the card to the detected platform after hydration, so the largest text block paints late. Real phone visitors also see "macOS · Detected" flash before the card corrects itself.
- Why it costs: an LCP over 2.5 s fails the mobile Core Web Vitals threshold on the page that should rank for "download WooCommerce POS", the highest-intent query the site targets. The macOS flash also tells an Android shop owner that the site misread their device.
- Fix: render a platform-neutral card on the server (or detect the platform from the request's User-Agent header server-side) so the first paint is already the final card. Then re-run Lighthouse mobile on /downloads, expecting LCP under 2.5 s.
- Scope: ok (one component; the swap is my diagnosis from the source, so confirm it with the LCP element in the trace before fixing)

## Runner-up notes (max 3 lines)
- /compare/square undersells WCPOS: "Where Square is genuinely better" says "WCPOS keeps taking cash sales offline". The glance row and the facts also include sales on a separate card terminal, and the "How do card payments work?" list omits Mercado Pago, PayArc and Windcave, which the glance row lists.
- /support is the thinnest indexable page. It has two H2s and Organization-only JSON-LD, its three sample questions are AI prompt buttons rather than content, and every guide link goes off-site.
- /pro's H1 "WCPOS Pro for WooCommerce POS" repeats "POS" and sells nothing. The only proof on the page that sells the paid product is a grey "5,000+ active stores" line, with no real review from a Pro buyer, although the home page already has one (adeline, lifetime Pro).
