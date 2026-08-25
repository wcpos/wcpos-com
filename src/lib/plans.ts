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
 * The policy ids are committed constants, not configuration. There is exactly
 * one Keygen account (license.wcpos.com) and these two policies are permanent
 * records inside it, so the ids are the same everywhere — including the e2e
 * mock backend, which serves these same ids from e2e/mocks/fixtures.json. They
 * are not secrets either; the yearly UUID has always shipped in the client
 * bundle. Changing a policy means editing this file, which is also the only
 * place that could have gone stale.
 *
 * An unrecognized policy id maps to no plan (null) — it is NEVER guessed as
 * Lifetime. Guessing is what the original else-branch did, and it mislabelled
 * every unknown policy as a Lifetime licence.
 */

export type PlanId = 'yearly' | 'lifetime'

export interface Plan {
  id: PlanId
  /** Medusa product handle this plan is sold as (stable product slug). */
  handle: string
  /** Keygen policy this plan's licenses are issued under. */
  policyId: string
  /** i18n key under the `account.licenses` namespace for the display label. */
  labelKey: 'planYearly' | 'planLifetime'
}

export const YEARLY_PRO_POLICY_ID = '261cb7e2-6e80-476e-98bd-fe7f406f258d'
export const LIFETIME_PRO_POLICY_ID = '1203b973-eb59-4965-9c19-12788212f827'
export const YEARLY_PRO_HANDLE = 'wcpos-pro-yearly'

const PLANS: readonly Plan[] = [
  {
    id: 'yearly',
    handle: YEARLY_PRO_HANDLE,
    policyId: YEARLY_PRO_POLICY_ID,
    labelKey: 'planYearly',
  },
  {
    id: 'lifetime',
    handle: 'wcpos-pro-lifetime',
    policyId: LIFETIME_PRO_POLICY_ID,
    labelKey: 'planLifetime',
  },
]

/** Resolve a plan from a Medusa product handle. Null when unrecognized. */
export function getPlanByHandle(handle: string): Plan | null {
  return PLANS.find((plan) => plan.handle === handle) ?? null
}

/**
 * Resolve a plan from a Keygen policy id. Null when the id is unregistered —
 * the caller renders a neutral fallback rather than guessing a plan.
 */
export function getPlanByPolicyId(policyId: string): Plan | null {
  if (!policyId) return null
  return PLANS.find((plan) => plan.policyId === policyId) ?? null
}
