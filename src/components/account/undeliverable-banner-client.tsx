'use client'

import { useTranslations } from 'next-intl'
import { MailWarning } from 'lucide-react'
import { Link } from '@/i18n/navigation'

/**
 * Deliberately not dismissible. Nothing the customer can do on this page
 * fixes it except changing the address, and a dismissed banner would leave
 * them silently unreachable — which is the whole failure being reported.
 */
export function UndeliverableBannerClient({ email }: { email: string }) {
  const t = useTranslations('account.emailUndeliverable')

  return (
    <div
      role="status"
      data-testid="email-undeliverable-banner"
      className="mb-6 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <div className="flex gap-3">
        <MailWarning className="mt-0.5 size-5 flex-none" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-medium">{t('title')}</p>
          <p className="text-sm">{t('body', { email })}</p>
        </div>
      </div>
      <Link
        href="/account/profile"
        className="flex-none rounded-md border border-amber-400 px-3 py-2 text-center text-sm font-medium underline-offset-4 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/40"
      >
        {t('cta')}
      </Link>
    </div>
  )
}
