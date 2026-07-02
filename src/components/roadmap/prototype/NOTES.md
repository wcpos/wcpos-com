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

**Verdict:** _(fill in after flipping through: which variant won, or which
pieces of which variants to combine — then fold the winner into the real page
and delete this directory.)_

Everything in this directory is throwaway. Do not promote directly to
production — rewrite the winner properly when folding it in.
