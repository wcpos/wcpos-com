# PROTOTYPE — roadmap page presentation variants

**Question:** How should /roadmap present milestones, features, and progress —
better, clearer, and more interesting than the current stacked card-grid layout?

**Shape:** Four variants on the existing `/roadmap` route, switchable via
`?variant=` and a floating bottom bar (dev-only). Data fetching unchanged; when
GitHub returns empty in dev, a realistic mock (mirroring beta.wcpos.com/roadmap
content, 2026-07) is substituted.

| key        | name                | idea |
| ---------- | ------------------- | ---- |
| `current`  | Current design      | Baseline — existing MilestoneList |
| `timeline` | Release train       | One vertical timeline spine; time is the hierarchy. Ghost version numerals, status glyphs, dashed future / faded past rail. |
| `board`    | Status board        | Now / Next / Shipped as three dense columns; status is the hierarchy. Progress rings, compact rows, everything scannable at once. |
| `focus`    | Mission control     | Dark hero panel for the active milestone with a big progress ring + stats; features as a worklog; Next as a numbered queue; Shipped as a changelog. |

**Verdict (2026-07-02):** owner picked **timeline (Release train)**. Follow-up
tweaks applied in the prototype: bug fixes as a small accordion
(`timeline-bugs.tsx`), hero chip links to the GitHub project board
(https://github.com/orgs/wcpos/projects/4). Next step: rewrite the timeline
variant properly, fold it into the real page, delete the other variants + the
switcher + this directory.

**GitHub-side changes made for correct bucketing (2026-07-02):**
- Closed `v1.9.x` milestones (woocommerce-pos #14, monorepo #14) → group now
  renders under Shipped. Three open Cloud Print issues remain attached to the
  closed milestones and need a new home (owner decision).
- Created `v1.11.0` milestone in wcpos/roadmap (#12, "Checkout & payments",
  due 2026-07-31) to match the existing ones in woocommerce-pos/monorepo.
- Assigned roadmap#3 (Split payment support epic) + monorepo#43 (Checkout
  conditions system) to v1.11.0 and set roadmap#3's board Status to "Up Next"
  (Backlog items are filtered off the public page).

Everything in this directory is throwaway. Do not promote directly to
production — rewrite the winner properly when folding it in.
