# Agent Instructions

## Review guidelines

Respect documented author intent and check for companion PRs.

- Read the PR body before the diff. If it has sections like "Design
  decisions", "Companion PRs", "Cross-repo", or "Intent", treat them as
  the author's binding statement of design — constraints, not code to
  second-guess. Do not raise a finding that would contradict a documented
  choice.
- Assume work often spans multiple repos in this org. "Missing caller",
  "dead code", and "unused export" findings are often wrong because the
  caller lives in a companion PR. Before flagging dead or missing code,
  check whether the PR description references companion PRs in other
  repos.
- When author intent is unclear, ask a question rather than request a
  change.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
