# wcpos.com hill climb — judge brief

You are one of five independent judges scoring the live marketing site
https://wcpos.com for a hill climb. Each round the three lowest-scoring
defects are fixed and the site is re-judged, so your job is to find the
defect that matters most, not to list everything.

## Inputs (all local, captured from the live site this round)

Round folder: `{ROUND_DIR}` (absolute path given in your prompt).

- `shots/<page>-desktop-fold.jpg`, `shots/<page>-phone-fold.jpg`: first screen at 1440x900 and 390x844.
- `shots/<page>-desktop-full.jpg`, `shots/<page>-phone-full.jpg`: whole page.
- `text/<page>.txt`: visible text of each page (desktop).
- `facts.json`: per page and viewport: title, meta description, canonical, hreflang count, H1/H2 list, JSON-LD types, internal link count, images without alt, horizontal overflow at phone width.
- `lighthouse.json`: Lighthouse mobile and desktop scores and failing audits for /, /pro, /compare, /downloads, /de.

Pages: home (`/`), pro, compare (hub), compare-square (one comparison page), downloads, extensions, support, and nl-home, nl-pro, de-home, de-pro (to check how Dutch and German long words fit).

The source is in the repo at `{REPO}` (Next.js, copy in `messages/*.json`,
pages in `src/app/[locale]/(main)/`). Read it if you need to confirm a cause;
the score is for what a visitor sees. You may fetch https://wcpos.com pages
if a capture is missing something, but keep it to a handful of requests (the
host rate-limits this machine). Do not fetch any other host.

## Product facts (for judging accuracy, not to copy)

- WCPOS is a point-of-sale plugin for WooCommerce plus apps (web, Windows,
  macOS, iOS, Android). Free and open source core; WCPOS Pro is a paid add-on.
- WCPOS 2.0 was released on 9 Nov 2026 (plugin, desktop and web). The iOS
  and Android 2.0 store apps are not out yet. Tap to Pay is NOT in 2.0; it
  follows in an app update. In 2.0, browsing, carts and sales paid in cash
  or with the Card tender (an external terminal) complete offline and sync
  later; integrated card readers and online gateways need a connection
  (wiki product/features/free-selling.md, docs#533). The Reports screen for
  today on this register is free in 2.0; Pro widens it to other days,
  registers and stores.
- Anything the site says beyond these facts, judge as a visitor would; flag
  a claim only if the site itself contradicts it or it is one of the facts
  above.

## Tracks (score each 1–10, 10 = nothing worth fixing)

1. **Marketing** — message clarity, proof, call to action. Key test: a shop
   owner landing on the home page understands, within 10 seconds, what WCPOS
   is and why version 2 matters.
2. **UI** — layout, type, spacing, hierarchy, phone width, how nl/de copy fits
   (wrapping, truncation, overflow), perceived speed.
3. **SEO** — titles, descriptions, headings, structured data, internal links,
   Lighthouse SEO/performance, sitemap, canonical, hreflang.

## Rules for the worst defect

For each track give the ONE defect that most lowers your score. It must be
fixable as a small, contained change (copy, markup, a component's styling, a
metadata field) on an existing page. Scope limits for the fixes — a defect
whose only fix breaks one of these is still worth naming, but mark it
`needs-front-desk`:
- no pricing or licensing changes;
- no new product claims, invented numbers, invented testimonials, or
  announcing unreleased versions or features;
- no major redesign and no new page.

Be specific: page, viewport, the element (quote the text), what is wrong,
why it costs the visitor or the ranking, and a one-line fix. Do not repeat
a generic best practice that the site already meets.

## Output

Write exactly one file, `{ROUND_DIR}/judges/{JUDGE_ID}.md`, in this format and
nothing else:

```
# Judge: {JUDGE_ID} ({PERSONA_SHORT})

## 10-second test
What is WCPOS: <one sentence, in your persona's words, from the home fold only>
Why version 2: <one sentence, or "not answered">

## Scores
| Track | Score |
|---|---|
| Marketing | n |
| UI | n |
| SEO | n |

## Worst defect — Marketing
- Page/viewport: …
- Element: "…"
- Problem: …
- Why it costs: …
- Fix: …
- Scope: ok | needs-front-desk (reason)

## Worst defect — UI
(same fields)

## Worst defect — SEO
(same fields)

## Runner-up notes (max 3 lines)
```

Do not edit any other file, do not run git, do not open PRs or issues.
Finish within 30 minutes.
