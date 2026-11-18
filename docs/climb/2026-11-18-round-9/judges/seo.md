# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce that turns a tablet into the store's register, using the same catalog, stock and prices, even offline.
Why version 2: The "New in 2.0" line above the H1 says opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: `/pro`, all locales, desktop and phone ("What's included in Pro?" grid, second card).
- Element: "Payment Terminal Integration — Connect card readers and payment terminals for fast, accurate in-person payments."
- Problem: This is Pro's most purchase-driving feature after registers and stores, and the card names no processor and links nowhere. The site already says which ones work. The home page says "Pro connects card readers like Stripe Terminal and SumUp", and `/extensions` lists Stripe, Square, SumUp, PayPal, Mollie, Windcave, Mercado Pago and PayArc terminals, each with docs. A shop owner's first question is "does it work with my Stripe/Square/SumUp reader?", and the page that asks for $129 does not answer it. `/pro` has no in-body link to `/extensions` at all; the only one is in the footer.
- Why it costs: A buyer who already has a reader leaves `/pro` to check compatibility, often by searching, and may not come back. The `/extensions` page targets "WooCommerce POS card terminals" queries, but the money page passes it no contextual link, and the `/pro` copy misses "Stripe Terminal", "Square Terminal" and "SumUp", the terms buyers search with.
- Fix: Change the card body to name the processors the site already lists, e.g. "Take card payments on Stripe, Square, SumUp, PayPal, Mollie or Windcave terminals, with more on the extensions page." Make "extensions page" (or the card title) a link to `/extensions`, in every locale.
- Scope: ok. This reuses claims the site already publishes on `/` and `/extensions`. There are no price or plan changes.

## Worst defect — UI
- Page/viewport: `/pro` and every `/xx/pro`, phone (390×844); see `pro-phone-fold.jpg`.
- Element: Right after the H1 "WCPOS Pro" and its subtitle comes "Get Pro / One license, all features… / Yearly · Most Popular · $129 USD /yr / Lifetime · $399 USD once". "What's included in Pro?" and the feature cards start only below the whole buy box.
- Problem: On desktop the features and the buy box sit side by side. When the columns stack on phone, the price comes first, so the first phone screen is two prices and no feature list. Round 8 (#740) tidied the price rows, but the stacking order stays as it was. Round 7's work to put "More Registers & Multiple Stores" first in the list is still a full scroll below the price on phone.
- Why it costs: On the one conversion page, phone visitors meet the price before anything that justifies it, and many bounce before they scroll. The H2 that names the page's topic also falls below the fold on phone.
- Fix: Give the feature column the earlier order below `lg` (`order-1` on the features column, `order-2` on the buy box, `lg:order-none` on both). The desktop layout stays unchanged.
- Scope: ok. Only the stacking order changes; the price wording and format stay as they are.

## Worst defect — SEO
- Page/viewport: `/downloads`, all ten locales, desktop and phone.
- Element: `<h1>One till, every device.</h1>` (`messages/en.json:1632`, `downloads.hero.title`). The "DOWNLOADS" eyebrow above it is a `<p>`. The H2s are "One store at the centre. Every till in sync.", "Three steps to your first sale" and "What's new".
- Problem: This is the fifth round this has been flagged; it has been deferred every time and is still unchanged live. The title ("Download WooCommerce POS for Mac, Windows, Linux & Web | WCPOS") and the SoftwareApplication JSON-LD target download queries. The page's only H1 has no "download", "WooCommerce", "POS" or platform name, and it uses "till", a British word, on a site that says "register" everywhere else. Every other money page puts WooCommerce or POS in its H1: home, `/compare`, `/compare/*` and `/extensions`.
- Why it costs: After the title, the H1 is the strongest on-page relevance signal. When the title and H1 disagree, Google is more likely to rewrite the title in results. Searches like "WooCommerce POS app download" or "WooCommerce POS for Windows" get no heading-level match, and US owners read "till" as foreign copy.
- Fix: Set `downloads.hero.title` to "Download WooCommerce POS for every device" in en, using each locale's term from its home title (de "Kassensystem", nl "Kassasysteem", and so on). Keep "One till, every device." as a line under the H1 if wanted, and update the H1 assertion in `downloads/page.test.tsx`.
- Scope: ok

## Runner-up notes (max 3 lines)
- `/support` is still the only brand-only title, "Support | WCPOS". "WCPOS Support – WooCommerce POS Help" would fix it.
- The shared SoftwareApplication JSON-LD on home and `/downloads` (`src/lib/software-application-json-ld.ts`) has no `description` and a fixed `url` of `https://wcpos.com` on every locale. `/pro` has both.
- `/pro` shows five FAQ questions with no `FAQPage` JSON-LD, though all `/compare/*` pages have it. The rich-result payoff is small, but the markup is inconsistent.
