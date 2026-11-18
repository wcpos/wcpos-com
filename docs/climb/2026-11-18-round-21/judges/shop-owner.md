# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free, open-source till for my WooCommerce shop. It turns a tablet into my register with the same products, stock and prices, and it keeps working when the internet drops.
Why version 2: The red "New in 2.0" line says that opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, desktop and phone (the "Get Pro" buy box)
- Element: Under "Get Started", the only try-first nudge is "Try the free version first — upgrade once you know it does the job". It links to /downloads. The page has no link to the live demo, and the word "demo" never appears on it (`messages/en.json` `tryFreeLink`/`tryFreeSuffix`, around line 483). This is unchanged since round 20.
- Problem: The price box is where I decide between Square, FooSales and this one. The site already has the easiest trial there is: "Try Live Demo" on the home page, or "Try everything first at demo.wcpos.com/pos (login demo / demo)" on /compare/square. It runs Pro with nothing to install. But at the $129 decision point, "try it first" sends me to a downloads page full of plugin and desktop installers. I'm not technical, and installing a plugin on my live shop is the step I put off.
- Why it costs: Square and FooSales let me click around before I pay. On /pro the no-effort trial is missing at the moment of purchase, so I leave to "think about it" and don't come back. The page that most needs the demo is the only key page without it.
- Fix: Add "or try the live demo (login demo / demo)" after the existing "Try the free version first" note in the /pro buy box. Link it to the same demo URL the compare pages use, in all locales.
- Scope: ok (one link to an existing demo inside an existing note; prices and plan terms untouched)

## Worst defect — UI
- Page/viewport: /compare/square (and the other /compare/* pages), phone 390 px and desktop
- Element: Under "Which should you choose?", the "Choose WCPOS if:" box is a single 60-word run-on sentence: "You want every sale, online and in person, to be a WooCommerce order sold from one catalog, with no second catalog to keep in sync, run more than one store, sell outside Square's eight countries, want a register in a web browser or …". "Choose Square for WooCommerce if:" is the same kind of comma chain. The "What Square for WooCommerce doesn't do" and "Where Square is genuinely better" sections just above are tidy bullet lists.
- Problem: The verdict is the part I scroll down to on my phone. It's the "which one is for me" answer. Here it's the hardest block on the page to skim, a grey wall of clauses with no breaks. I can't tick off "market stall? more than one store? want a browser till?" line by line the way I can in the bullet sections above it. On a 390 px screen the WCPOS box runs about ten lines before the Square box starts.
- Why it costs: The page earns my trust with sourced bullets, then makes the decision itself hard to read. Visitors who skim straight to the verdict, as I did, get a paragraph instead of a checklist and bounce without a clear "this is me".
- Fix: Render each "Choose X if:" body as a bulleted list, one condition per item, using the same list styling as "What … doesn't do". Split the existing clauses only and don't change the wording, starting with /compare/square and /compare/foosales.
- Scope: ok (markup in the shared compare template, plus splitting the existing strings into arrays per locale; no new claims)

## Worst defect — SEO
- Page/viewport: /compare/square (and every /compare/* page), all locales
- Element: The title is "WCPOS vs Square for WooCommerce (2026) | WCPOS", and the body shows "Square facts verified 2026-10-06 …" and "We re-verify every quarter". In facts.json, the JSON-LD on /compare/square is still only Organization, FAQPage and BreadcrumbList, with no `datePublished` or `dateModified` anywhere.
- Problem: The page's selling point is fresh, dated, sourced facts, and the title and the body both promise that. But no machine-readable date backs it up, so search engines have to guess the date from the prose. This was raised last round and wasn't picked, and it's still the gap on the pages that win "Square for WooCommerce vs" and "FooSales alternative" searches.
- Why it costs: A dated result is what makes an honest comparison stand out next to vendor pages and stale listicles. Without one, the snippet may show no date or the wrong one, and the click goes to Square's or FooSales' own page.
- Fix: Add an `Article` JSON-LD node to the shared compare template, with `headline` (the H1), `datePublished` and `dateModified` set to each page's existing verified date, and `author` and `publisher` pointing to the existing Organization.
- Scope: ok (metadata only; the dates are already on the page)

## Runner-up notes (max 3 lines)
- The /compare hub now leads with Square and FooSales, which matches the home line. That was my round-20 UI defect, and it's fixed.
- The /pro H1 "WCPOS Pro for WooCommerce POS" reads as "POS for POS" to me. "WCPOS Pro" plus the existing subtitle would be clearer.
- The /extensions "Pro" chip still drops onto its own line under every card title on phone.
