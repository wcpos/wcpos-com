/**
 * Plan registry — the single source of truth for the WCPOS Pro plan tiers.
 *
 * A Plan (Yearly / Lifetime) is the product tier a License grants. It is keyed
 * by TWO unrelated external IDs that must not drift apart:
 *   - a Keygen policy id (what the account area sees on a License), and
 *   - a Medusa product handle (what marketing/checkout sells).
 * Both, plus the display translation key, live here so every surface derives
 * the same Yearly/Lifetime distinction one way.
 *
 * Policy ids are environment-specific (e2e issues a different lifetime policy
 * than production), so they are read from NEXT_PUBLIC_* env with the known
 * yearly UUID as the default. NEXT_PUBLIC_ because the only badge consumer is a
 * client component; policy ids are not secrets (the yearly UUID already shipped
 * in the client bundle). An unrecognized policy id maps to no plan (null) — it
 * is NEVER guessed as Lifetime (see docs/plans/2026-06-15-plan-registry.md).
 */

export type PlanId = 'yearly' | 'lifetime'

export interface Plan {
  id: PlanId
  /** Medusa product handle this plan is sold as (stable product slug). */
  handle: string
  /** Keygen policy this plan's licenses are issued under, or null if the
   *  environment has not configured it yet. */
  policyId: string | null
  /** i18n key under the `account.licenses` namespace for the display label. */
  labelKey: 'planYearly' | 'planLifetime'
}

// Default for the only policy id known to the codebase. Overridable per
// environment via NEXT_PUBLIC_KEYGEN_YEARLY_POLICY_ID.
export const DEFAULT_YEARLY_POLICY_ID = '261cb7e2-6e80-476e-98bd-fe7f406f258d'

function normalizeEnvPolicyId(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/**
 * Build the registry from the current environment. Reads env at call time so
 * deploy config (and e2e/test overrides) take effect; the NEXT_PUBLIC_*
 * references are still statically inlined into the client bundle by Next.
 */
function getPlans(): Plan[] {
  return [
    {
      id: 'yearly',
      handle: 'wcpos-pro-yearly',
      policyId:
        normalizeEnvPolicyId(process.env.NEXT_PUBLIC_KEYGEN_YEARLY_POLICY_ID) ??
        DEFAULT_YEARLY_POLICY_ID,
      labelKey: 'planYearly',
    },
    {
      id: 'lifetime',
      handle: 'wcpos-pro-lifetime',
      policyId: normalizeEnvPolicyId(
        process.env.NEXT_PUBLIC_KEYGEN_LIFETIME_POLICY_ID
      ),
      labelKey: 'planLifetime',
    },
  ]
}

/** Resolve a plan from a Medusa product handle. Null when unrecognized. */
export function getPlanByHandle(handle: string): Plan | null {
  return getPlans().find((plan) => plan.handle === handle) ?? null
}

/**
 * Resolve a plan from a Keygen policy id. Null when the id is unregistered or
 * the environment has not configured that plan's policy id — the caller renders
 * a neutral fallback rather than guessing a plan.
 */
export function getPlanByPolicyId(policyId: string): Plan | null {
  if (!policyId) return null
  return (
    getPlans().find((plan) => plan.policyId !== null && plan.policyId === policyId) ??
    null
  )
}
