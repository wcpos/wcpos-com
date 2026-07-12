import { getImpersonation } from '@/lib/impersonation'
import { getCustomer } from '@/lib/medusa-auth'
import { isCustomerSecurityHeld } from '@/lib/customer-security-hold'
import { getTranslations } from 'next-intl/server'

/**
 * Shown across the whole account area while inspecting. `getCustomer()` here is
 * the TARGET (impersonation is active), so its email is the inspected account.
 */
export async function ImpersonationBanner({ locale }: { locale: string }) {
  const impersonation = await getImpersonation()
  if (!impersonation) return null
  const target = await getCustomer()
  const t = await getTranslations({ locale, namespace: 'account.impersonation' })
  const securityHoldActive = isCustomerSecurityHeld(target?.metadata)

  return (
    <div className="flex items-center justify-between gap-4 bg-amber-500 px-4 py-2 text-sm text-black">
      <div className="flex flex-wrap items-center gap-2">
        <span>
          {t.rich('viewing', {
            target: target?.email ?? impersonation.targetId,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </span>
        {securityHoldActive && (
          <strong className="rounded bg-black/15 px-2 py-0.5">
            {t('securityHold')}
          </strong>
        )}
      </div>
      <form action="/api/account/impersonate/exit" method="post">
        <button
          type="submit"
          className="rounded bg-black/80 px-3 py-1 text-white hover:bg-black"
        >
          {t('exit')}
        </button>
      </form>
    </div>
  )
}
