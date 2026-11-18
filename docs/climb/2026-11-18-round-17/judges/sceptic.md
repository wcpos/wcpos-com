# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source WooCommerce register that uses my existing catalog, stock and prices.
Why version 2: Register opening and closing, split payments and today’s sales report are now included free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 9 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: Home `/`, desktop and phone.
- Element: “Internet drops? Keep selling; WCPOS syncs when you’re back online.”
- Problem: Observed: the home promise omits the payment limitation that `/downloads` and `/compare/square` explicitly disclose. Cash and external-terminal Card tender sales complete offline; integrated readers and online gateways require connectivity.
- Why it costs: Inferred: a buyer comparing Square’s offline card acceptance could mistake WCPOS’s offline sales recording for equivalent integrated payment capability. Discovering the distinction later undermines trust.
- Fix: Qualify this paragraph: “Keep selling offline with cash or record payments taken on your separate terminal. Integrated readers and online gateways need a connection; offline sales sync when you reconnect.”
- Scope: ok

## Worst defect — UI
- Page/viewport: `/downloads`, phone at 390px.
- Element: “What’s new” release-note content, specifically the captured `code` element.
- Problem: Observed: `facts.json` flags a code element extending beyond the viewport’s right edge, although page width remains 390px. Inferred: release-note code can escape its readable column; the Markdown renderer has no inline-code wrapping rule.
- Why it costs: Inferred: someone checking upgrade details on a phone may encounter cut-off technical text on the download decision page.
- Fix: Allow long inline-code content in release notes to wrap within the available width, preserving horizontal scrolling for fenced code blocks.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/support`, desktop and phone; crawlable page content.
- Element: “Which barcode scanners are supported?” and “How do I sync products from WooCommerce?”
- Problem: Observed: these useful support topics appear as questions without static answers or topic-specific documentation links. Source confirms they are buttons that request an answer interactively.
- Why it costs: Inferred: the page offers little indexable substance for these specific WooCommerce POS support searches; crawlers cannot follow the buttons to the relevant guidance.
- Fix: Add a compact static documentation-link row beneath the suggested questions, linking directly to the existing scanner and product-sync guides with descriptive anchor text.
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: all supplied Lighthouse SEO scores are 100; captured canonicals are appropriate and each page has 11 hreflang entries.
Observed: all captured phone pages, including Dutch and German, have document width equal to viewport width.
Not verified: screenshot appearance and actual fold boundaries; the supplied `foldText` field is the first 600 body-text characters, not a viewport extraction.