'use client'

import { useState, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import {
  readAnalyticsConsent,
  writeAnalyticsConsent,
  type AnalyticsConsentStatus,
} from '@/lib/analytics/consent'
import { initPostHogBrowser } from '@/lib/analytics/posthog-browser'

const emptySubscribe = () => () => {}

/** Server snapshot sentinel: hides the banner during SSR/hydration. */
const SSR_PENDING = 'ssr-pending' as const

function useConsentDecision() {
  return useSyncExternalStore<AnalyticsConsentStatus | null | typeof SSR_PENDING>(
    emptySubscribe,
    () => readAnalyticsConsent(),
    () => SSR_PENDING
  )
}

/**
 * GDPR analytics consent banner.
 *
 * Shown only when no consent decision has been recorded. Accepting allows
 * analytics (the middleware then sets the distinct-id cookie); declining
 * disables analytics and removes the distinct-id cookie.
 */
export function ConsentBanner() {
  const t = useTranslations('consent')
  const consent = useConsentDecision()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || consent !== null) {
    return null
  }

  const decide = (status: AnalyticsConsentStatus) => {
    writeAnalyticsConsent(status)
    if (status === 'granted') {
      // Start capture in the same session consent is granted; the consent
      // cookie was just written, so initPostHogBrowser's gate now passes.
      initPostHogBrowser({
        key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      })
    }
    setDismissed(true)
  }

  return (
    <div
      role="region"
      aria-label={t('label')}
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background p-4 shadow-lg"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {t.rich('message', {
            privacyLink: (chunks) => (
              <Link href="/privacy" className="underline underline-offset-4">
                {chunks}
              </Link>
            ),
          })}
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => decide('denied')}
          >
            {t('decline')}
          </Button>
          <Button type="button" size="sm" onClick={() => decide('granted')}>
            {t('accept')}
          </Button>
        </div>
      </div>
    </div>
  )
}
