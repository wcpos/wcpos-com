# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source register for a WooCommerce store. It turns a tablet into the till and sells from the store's own catalog, stock and prices, even offline.
Why version 2: The red "New in 2.0" line says that opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: Home, both viewports, all locales. It is worst on phone, where each card fills most of a screen.
- Element: The third card under "What store owners say", tagged "Desktop & Offline". Its quote is "Great POS for your WooCommerce store, it has the desktop version which makes it better for places with weak internet connectivity. I believe there are more great features coming up." (`messages/en.json:112-113`)
- Problem: #845 fixed the heading, and the first two tags now read as who is speaking ("Retail Store", "Market Vendor"). The third tag still names product features, so the set no longer matches the heading it sits under. It is the only card where the speaker is not a kind of store owner. The quote also ends on "more great features coming up". That reads as a wish list ten days after the 2.0 launch the hero announces, and it is the last line of proof before the feature grid.
- Why it costs: These three cards are the page's real customer proof. A shop owner reads the tags first. Two say "people like me use this", and the third says "a feature list". The section closes on its weakest sentence. This is the fourth round I have named the card. Only the heading has changed.
- Fix: Retag the third card as the kind of store the review describes, for example "Patchy internet" (de "Schwaches Internet", nl "Zwak internet"). Cut the quote after "…weak internet connectivity." and keep an ellipsis to mark the cut. Both are copy edits to the existing review, so there is no new quote and no new claim.
- Scope: ok

## Worst defect — UI
- Page/viewport: /support, desktop (1440) and phone. On desktop the panel spans y ≈ 1125–1725 of the full-page capture.
- Element: The block under "Prefer to talk to a human?" / "Open Discord". It is a 600 px tall, 768 px wide solid #36393e panel with no text, no logo and no spinner (`src/components/support/discord-section.tsx`, `discord-widget.tsx`, iframe `bg-[#36393e]`).
- Problem: The light skeleton is swapped for the iframe as soon as the box nears the viewport. The iframe paints its dark background straight away and stays blank until WidgetBot's ~2.8 MB embed boots. In this round's capture it never filled. The result is the largest element on the page: a dark slab with nothing in it, on an otherwise white, light-grey page, sitting right after the new guides block. It looks like a broken embed. On phone it fills almost a whole screen. Round 34 also listed it as deferred.
- Why it costs: /support is where an anxious owner arrives. A big empty dark rectangle tells them something failed, just under the promise of a human. It also pulls the eye away from the "Open Discord" button, which is the action that works.
- Fix: Keep the light `Skeleton` on top of the iframe until its `onLoad` fires. Or make the box a click-to-load facade (Discord mark, "Load live chat" button, same 600 px box, so no layout shift) and mount the iframe only on click. Both change only the existing component.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /support (all locales).
- Element: The JSON-LD is "Organization" only. The page now has an H1, two H2s ("Start with these guides", "Prefer to talk to a human?") and five docs links.
- Problem: Since #847 /support has real structure. Its markup still describes nothing on the page itself: no WebPage or ContactPage node, and no BreadcrumbList. /compare/square has both, and /pro has SoftwareApplication plus FAQPage. /support is now the only top-level page whose schema is just the site-wide Organization. Nothing ties the page to the help resources it links (docs.wcpos.com, the Discord invite).
- Why it costs: This is small, but it is the most visible SEO gap left on the pages I checked. Every page has a title, a description of 145–159 characters, a canonical and 11 hreflang links. Lighthouse SEO is 100 everywhere it was measured. /support is the page that has to hold "WooCommerce POS support" queries. Markup that names it as a help or contact page, with its docs and Discord channels, is the cheap remaining signal.
- Fix: On /support, add a `ContactPage` (or `WebPage`) node with `name`/`description` from the existing metadata, `about` set to WCPOS, and `significantLink` for the five guide URLs and the Discord invite. Add a `Home › Support` BreadcrumbList like /compare/square's.
- Scope: ok (markup only, existing URLs, no new claims)

## Runner-up notes (max 3 lines)
- /downloads desktop, step 2: "macOS (Apple Silicon) ·" and "Set up on your store ·" still end their lines with a stranded "·". Keep each separator with the link that follows it (`whitespace-nowrap` on "· link"), or stack the links.
- The "Pro" badge is amber on the home feature cards but red-pink on every /extensions card. Use one badge style for one label across the site.
- The home figure "5,000+" is now locale-formatted, but its label still says "Active Installations" while the hero badge says "Active Stores". Use one label for the one number.
