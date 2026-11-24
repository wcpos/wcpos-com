# Blanket 14-day money-back guarantee instead of EU withdrawal-waiver mechanics

> **Status: superseded by #616.** This ADR is kept for history. The refund policy is now the owner's own commercial term: if WCPOS Pro doesn't do what we say it does, we'll fix it or refund you. There is no 14-day guarantee and no withdrawal-waiver mechanism. The current policy is the text at `/refunds` (`messages/en.json` → `legal.refunds`).

The business is Australian-registered but relocating to the EU (planned
for the coming months, as of June 2026), where consumers hold a statutory 14-day withdrawal right for
digital content unless checkout collects an express waiver. Rather than
keep the historical no-refund policy and add a consent checkbox to
checkout (conversion friction, geo-targeting complexity, stored-consent
bookkeeping), we offer every customer worldwide a voluntary 14-day
money-back guarantee. This matches the EU statutory window by
construction — so checkout stays friction-free and the policy needs no
jurisdiction logic — and a granted refund revokes the license (ADR-0001).
Considered and rejected: no-refund + absorbing EU withdrawals (policy
says one thing, law does another); no-refund + checkout waiver (legally
sound but costs conversion on every sale to dodge a refund request that
is, in practice, rare).
