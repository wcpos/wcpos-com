import { getImpersonation } from '@/lib/impersonation'
import { getCustomer } from '@/lib/medusa-auth'
import { isCustomerSecurityHeld } from '@/lib/customer-security-hold'
import { getTranslations } from 'next-intl/server'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toneSurface } from '@/components/ui/status-tone'
import { cn } from '@/lib/utils'
import type { Locale } from '@/i18n/config'

/**
 * Shown across the whole account area while inspecting. `getCustomer()` here is
 * the TARGET (impersonation is active), so its email is the inspected account.
 */
export async function ImpersonationBanner({ locale }: { locale: Locale }) {
  const impersonation = await getImpersonation()
  if (!impersonation) return null
  const target = await getCustomer()
  const t = await getTranslations({ locale, namespace: 'account.impersonation' })
  const securityHoldActive = isCustomerSecurityHeld(target?.metadata)

  // A quiet caution band (ADR 0009), not a solid fill: status is a tint.
  return (
    <div className={cn('text-sm', toneSurface.caution)}>
      <div className="container mx-auto flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <Eye aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p className="min-w-0">
            <span>
              {t.rich('viewing', {
                target: target?.email ?? impersonation.targetId,
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </span>
            {securityHoldActive && (
              <strong className="ms-2 rounded bg-amber-500/15 px-2 py-0.5">
                {t('securityHold')}
              </strong>
            )}
          </p>
        </div>
        <form action="/api/account/impersonate/exit" method="post">
          <Button type="submit" variant="outline" size="sm" className="text-foreground">
            {t('exit')}
          </Button>
        </form>
      </div>
    </div>
  )
}
