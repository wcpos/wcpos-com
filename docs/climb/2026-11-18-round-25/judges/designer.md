# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce that turns a tablet into the shop's register, selling from the same catalog, stock and prices as the online store, even offline.
Why version 2: The red "New in 2.0" line above the kicker answers it on desktop and phone: in 2.0 you can open and close the register, split payments and see today's sales, all free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /downloads, desktop and phone, all locales. Visitors land here from the home page's "Download Free" buttons (in the hero and the closing band).
- Element: The selected card is "macOS · Detected · Version 2.0.4 · Apple Silicon · .dmg", with a full-width red "Download for macOS" button. Above it, the plugin appears only as an inline link in a grey sentence: "Every app connects to the <u>free WordPress plugin</u> — install it first."
- Problem: The page gives its whole visual weight to step 2. The desktop app is a client and does nothing until the plugin is installed on the store. The plugin is the actual free product and the required first step, but it gets body-size link text, while the .dmg gets the page's only primary button. Round 7 moved the sentence above the button, which fixed the reading order but not the hierarchy. A visitor's eye still goes straight to red.
- Why it costs: "Download Free" is the site's main conversion path. A shop owner who clicks it, downloads a .dmg and opens it gets a login screen that asks for a store URL that can't work yet. That is the worst possible first run, and it happens right after the home page promised it would be easy.
- Fix: In the download card, make the plugin a visible step. Put a secondary (outline) button, "1 · Get the free plugin", linking to the existing plugin target, directly above the red button. Prefix the app button with "2 ·", or give it a caption. Use only copy and links that are already on the page.
- Scope: ok. This is component styling and existing copy on an existing page, with no new claim.

## Worst defect — UI
- Page/viewport: /compare/square, /compare/foosales, /compare/vitepos and /compare/yith-pos, on phone (390), in all locales. The phone full-page capture cuts off before the section again this round. The markup is unchanged since round 24: `square/page.tsx:341`, `foosales/page.tsx:288`, `vitepos/page.tsx:275`, `yith-pos/page.tsx:278`. All four still use `className="break-all … underline"` on a link whose text is the raw URL.
- Element: The "Sources" list, for example "Tap to Pay on iPhone: https://squareup.com/help/us/en/article/7786-get-started-with-tap-to-pay-on-iphone", rendered as underlined white text that breaks mid-word ("http / s://", "iphon / e").
- Problem: The strongest type weight (white, medium, underlined) falls on the least readable string, and `break-all` breaks it at arbitrary letters. Each item becomes two or three lines of broken URL. The Square list of 14 items forms a wall of underlines about a phone screen tall. The human label sits in muted grey before each URL, so the hierarchy is inverted. This is the second round it has been deferred.
- Why it costs: The Sources section exists to earn trust for claims about competitors. On phone it looks machine-dumped and broken, which undercuts the "sourced, dated" promise the hub makes in its own subtitle. Four pages and ten locales share the defect.
- Fix: Make the label the link text, then show the bare host muted after it ("<a>Tap to Pay on iPhone</a> · squareup.com ↗", using `new URL(url).hostname`). Drop `break-all` on the four lists, ideally through one shared `SourcesList` component.
- Scope: ok. This is markup and styling only. The URLs and labels stay the same.

## Worst defect — SEO
- Page/viewport: Home, all viewports and locales. This is the pricing teaser's `home.pricing.compareLine`, rendered by `pricing-teaser-section.tsx:151`.
- Element: "Weighing up Square or FooSales? <link>See how WCPOS compares</link>". The link goes only to /compare.
- Problem: The home page names the two comparisons it cares about most, but neither name is a link. The only anchor is the generic "See how WCPOS compares", and it points at the hub. Home has the fewest internal links of any captured page (13, against 19 on /compare/square and 20 on /compare). It is the site's most authoritative URL, yet it passes no direct equity or descriptive anchor text to /compare/square or /compare/foosales. Those are the two spokes that target the highest-intent queries ("Square for WooCommerce alternative", "FooSales vs").
- Why it costs: Deep links from the home page with keyword anchors ("Square", "FooSales") are the cheapest ranking signal the spokes can get, and right now they sit two clicks deep with only footer and hub links. Visitors pay too: a shop owner weighing Square has to land on the hub and find the card again.
- Fix: Change the message to "Weighing up <square>Square</square> or <foosales>FooSales</foosales>? <link>See how WCPOS compares</link>", with the tags linking to /compare/square and /compare/foosales, in all ten locales.
- Scope: ok. This is a copy and markup change on an existing line, with no new claim.

## Runner-up notes (max 3 lines)
- /downloads, phone: in the "How it fits together" hub diagram, the connector line runs through the "Desktop" label, and the iOS node sits about 20 px lower than Web, so the diagram looks unaligned.
- Home "Desktop & Offline" testimonial ends "I believe there are more great features coming up.", which is speculation rather than proof. End the quote at "…weak internet connectivity." It is a weak third card next to two strong ones.
- /support phone: the suggestion chips render greyed out until Turnstile is ticked, and "Answered by Aide…" still sits about 8 px above the widget, so it reads as the widget's label. /pro's JSON-LD `operatingSystem` still leaves out Web (`pro-product-json-ld.tsx:49`).
