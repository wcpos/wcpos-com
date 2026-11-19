# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source WooCommerce register that uses my existing products, stock and prices for counter sales.
Why version 2: Register opening and closing, split payments and today’s sales report are now included free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: Home, desktop and phone.
- Element: “Internet drops? Keep selling; WCPOS syncs when you’re back online.”
- Problem: Observed: the home page promotes integrated Stripe Terminal and SumUp payments without qualifying its offline promise. Downloads and the Square comparison explicitly say connected readers and online gateways need a connection.
- Why it costs: As a buyer comparing Square’s offline card payments, I could mistake offline order completion for offline integrated card processing. Discovering that distinction later undermines trust.
- Fix: Qualify this paragraph: cash and externally paid Card-tender sales can complete offline; connected readers and online gateways require internet.
- Scope: ok

## Worst defect — UI
- Page/viewport: Downloads, desktop and phone, “Three steps to your first sale.”
- Element: Step 2, “Web” → “Open the live demo.”
- Problem: Observed: the browser option in the installation sequence links to `demo.wcpos.com/pos`. After installing the plugin, this path provides no instruction or setup link for opening the register on my own store.
- Why it costs: The action hierarchy sends a buyer who is implementing the product back into evaluation. I still cannot complete the promised first-sale journey using my own catalog.
- Fix: Make the Web card’s primary action an existing installation-documentation link explaining how to open the store’s register; keep the demo secondary.
- Scope: ok

## Worst defect — SEO
- Page/viewport: Downloads, Lighthouse mobile.
- Element: “Download WooCommerce POS” landing page and its initial JavaScript workload.
- Problem: Observed in the supplied audit: performance 82, total blocking time 460 ms, LCP 3.0 seconds and 103 KiB estimated unused JavaScript. Technical SEO scores 100, but this page’s mobile delivery remains substantially weaker than Pro and Compare.
- Why it costs: Inferred: visitors arriving from download searches face delayed content and responsiveness at the installation decision. A ranking penalty is not established by this lab audit.
- Fix: Defer loading the existing below-fold sync-diagram component until it approaches the viewport, retaining a static placeholder; repeat the mobile audit to establish the benefit.
- Scope: ok — contained component-loading change; the diagram’s share of the measured cost is not verified.

## Runner-up notes (max 3 lines)
Observed: Downloads labels mobile apps “Beta” without clearly stating that the 2.0 store releases are still pending.
Observed: captured Dutch and German pages have no document-level horizontal overflow; screenshot-level wrapping and truncation were not verified.
Observed: the Square comparison supplies sources, dates and explicit competitor advantages, which strengthens credibility.