# 0008 — Support page is an AI assistant (Aide) with Discord fallback

Status: Accepted (2026-06-16)

## Context

The support page was a full-screen WidgetBot Discord embed with no self-serve path —
every question required a human in Discord. Meanwhile `wcpos-openclaw` already runs **Aide**,
a support agent backed by the `.wiki/` knowledge base, reachable over `POST /execute`.

## Decision

The support page's primary surface is an "ask anything" box that proxies to Aide and renders
her answer inline as a multi-turn chat. Discord is demoted to a lazy-loaded "talk to a human"
section below.

- The openclaw token stays server-side in `src/app/api/support/ask/route.ts`; the browser never
  sees it.
- The public endpoint is protected by Cloudflare Turnstile + Upstash per-IP rate limiting + a
  global daily budget ceiling. `agent_session` executions are slow and tool-capable, so the
  backing intent is capability-restricted to text and the route bounds latency (45s abort,
  `maxDuration = 60`).
- The agent and intent are configurable via `OPENCLAW_SUPPORT_INTENT` (default
  `aide.web.support_question`).

## Consequences

- Depends on the `aide.web.support_question` intent existing in wcpos-openclaw's routing policy
  (capability-restricted to `["text"]`). Until that ships, the endpoint returns
  `403 task_intent_denied`.
- Streaming responses, server-side conversation history, and structured source citations are
  deferred. Answers render whatever Markdown Aide returns (the gateway exposes no `sources`).
- The rate limiter and daily budget fail **open** when Upstash is unconfigured or errors — a
  deliberate availability-over-strictness choice so a Redis blip never takes the support box
  down. During an Upstash outage, Turnstile + the per-request timeout are the only remaining
  cost controls; a flapping gateway can also exhaust the day's counter with failed attempts.
  Revisit (e.g. fail the global budget closed, add an alert on the fail-open branch) if cost
  exposure becomes a concern.
- New runtime config required (server unless noted): `OPENCLAW_TOKEN`, `OPENCLAW_GATEWAY_URL`,
  `OPENCLAW_SUPPORT_INTENT`, `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (client),
  `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SUPPORT_DAILY_QUESTION_BUDGET`.

See `docs/superpowers/specs/2026-06-16-support-page-ai-assistant-design.md` and
`docs/superpowers/plans/2026-06-16-support-page-ai-assistant.md`.
