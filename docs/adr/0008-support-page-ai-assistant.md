# 0008 — Support page is an AI assistant (Aide) with Discord fallback

Status: Accepted (2026-06-16) — Amended (2026-07-03), see below

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

## Amendment (2026-07-03) — repoint to `POST /support/answer`

openclaw replaced the agent-session path with a dedicated grounded answerer
(openclaw #1315, publicly routed in #1316). The proxy now speaks that contract
instead of `/execute`:

- Request: `POST {OPENCLAW_GATEWAY_URL}/support/answer` with
  `{ question, session_id, channel: 'web' }`. `OPENCLAW_SUPPORT_INTENT` is
  gone — the answerer pins models and config in code.
- Response is structured: `{ answered, answer, sources, confidence, model }`.
  An escalation is an HTTP 200 with `answered: false` whose `answer` is the
  Discord hand-off message; the route forwards `answered` and `sources` to the
  client. The gateway cites sources now, superseding the "no `sources`" note
  above.
- The gateway enforces its own caps (12/session/hour, 120 global/hour, plus a
  Traefik 20 req/min/IP edge limit); its 429s pass through with their message
  rather than surfacing as a 503 outage.
- The answerer is a single-shot completion: `session_id` is a rate-limit key,
  not conversation memory. The chat UI implies multi-turn context that the
  backend does not have — follow-up questions must stand alone. Revisit if
  escalation styling or real multi-turn lands.
