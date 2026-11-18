# Judge: designer (product designer)

## 10-second test
What is WCPOS: A point of sale for WooCommerce that turns a tablet into your register, selling from the same catalog, stock and prices, even offline.
Why version 2: 2.0 adds opening and closing the register, split payments and today's sales, all free. The red "New in 2.0" line above the kicker says so at both widths.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /de/pro, phone and desktop. This is the buy box directly under the "Loslegen" button.
- Element: "Testen Sie zuerst die kostenlose Version — upgraden Sie erst, wenn sie sich bewährt hat" (`pro.*.tryFreeLink` + `tryFreeSuffix` in `messages/de.json`, lines 478–479).
- Problem: Everything else on /de and /de/pro addresses the reader as "du": "Hol dir Pro", "Wähle nur, wie lange du Updates möchtest", "Dein WooCommerce-Shop an der Ladentheke". The one reassurance line under the purchase button switches to formal "Sie". I named this as a runner-up in round 11 and it is still live.
- Why it costs: To a German reader, a register switch in the middle of a sentence group looks like stitched-together machine translation. It lands at the most sensitive point on the money page, the line meant to lower the risk of buying. It undercuts the trust the rest of the German copy builds, right where the visitor decides.
- Fix: Rewrite the two keys in "du", e.g. "Teste zuerst die kostenlose Version" + " — und steig erst um, wenn sie sich bewährt hat". Then grep the `pro` and `home` namespaces of de.json for any other "Sie/Ihr" address. Leave /compare's "Sie" for a separate pass.
- Scope: ok. Two copy keys in one locale. This is not price or plan-term wording, and it makes no new claim.

## Worst defect — UI
- Page/viewport: /downloads, phone 390 (every locale). It is the sync diagram above "HOW IT FITS TOGETHER / One store at the centre. Every till in sync."
- Element: The red "Your store · WooCommerce · + WCPOS plugin" hub and the "Desktop" node above it, in `src/components/downloads/sync-diagram.tsx`.
- Problem: At phone width the hub's red disc covers the "Desktop" label. In the capture, the top of "Desktop" disappears behind the circle. The orbit is laid out in percentages of a 440-unit box (`ORBIT_RADIUS = 138`, about 102 px at a 326 px container), but the hub is fixed at 112 px and the nodes at 58–66 px. On a narrow screen the nodes close in on the hub while the hub stays full size. The ±9 px idle drift makes the collision worse from frame to frame. On phone the diagram also renders above its own eyebrow and H2, so it floats unlabelled after the download card. On desktop (1440) the same diagram is clean.
- Why it costs: /downloads is where a visitor commits to install. The one illustration that explains the architecture looks broken on the device most visitors use, with a label hidden by a shape. It reads as unfinished craft on a page whose job is to make the product feel dependable.
- Fix: Scale the hub and nodes with the container: size them in % of SIZE, or `scale()` the whole diagram from its measured width. Alternatively, raise the orbit radius below `sm` so the label clears the hub. On phone, give the diagram `order-last lg:order-none` so the heading comes first.
- Scope: ok. Styling in one component and one class in `how-it-fits.tsx`, with no copy change.

## Worst defect — SEO
- Page/viewport: /pro, all locales.
- Element: "Frequently Asked Questions" (five Q&As: "Is the free plugin limited?", "What's the difference between Yearly and Lifetime?", "What happens when my license expires?", …). The JSON-LD on the page is only `Organization` + `SoftwareApplication`.
- Problem: The money page carries five visible FAQs but no `FAQPage` structured data. /compare/square already emits `FAQPage`, so the site has the pattern and leaves it off its most important commercial page. Woo-dev and the SEO judge raised this in round 11, and it was deferred.
- Why it costs: Those five answers are exactly what "woocommerce pos pro" and "wcpos license" searchers and answer engines ask: is free limited, what happens when a licence expires. Without markup, the passages are less likely to be lifted into rich results or AI answers. A rival's page with markup gets the citation instead.
- Fix: Emit a `FAQPage` JSON-LD next to `ProProductJsonLd`, built from the same `pro.faq` message keys the page renders, in each locale. Reuse the /compare FAQ JSON-LD helper.
- Scope: ok. Metadata only. The answers are copied from existing on-page text verbatim, so no plan-term wording changes.

## Runner-up notes (max 3 lines)
- The orphaned Pro badge (round 11) is still live: nl home phone "Voorraad en prijzen direct aanpassen" puts "Pro" alone and indented on the next line, and /extensions desktop does the same with "Windcave Terminal for WooCommerce". Keep the badge with the last word (`whitespace-nowrap`).
- The same proof number has two labels on home: the hero says "5,000+ Active Stores" (also on the /pro buy box) and the stats band says "5,000+ Active Installations". Pick the wp.org term and use it everywhere.
- /support desktop: about 200 px of dead space sits between the Cloudflare "Verify you are human" box and "Prefer to talk to a human?". The light-grey widget is the only light surface on the dark page, and the "Answered by Aide" caption touches its top edge.
