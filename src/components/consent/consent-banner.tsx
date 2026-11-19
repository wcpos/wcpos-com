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

function useConsentDecision() {
  return useSyncExternalStore<AnalyticsConsentStatus | null>(
    emptySubscribe,
    readAnalyticsConsent,
    // Render the undecided banner into the prerendered HTML response. A tiny
    // head script sets a data attribute before first paint so returning
    // visitors never see it flash while React hydrates.
    () => null
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
      // Fire-and-forget: the SDK loads async and nothing here depends on it.
      void initPostHogBrowser({
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
      data-consent-banner=""
      data-testid="consent-banner"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-lg sm:p-4"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 sm:justify-between">
        <p className="min-w-0 flex-1 text-xs leading-snug text-muted-foreground sm:text-sm sm:leading-5">
          {t.rich('message', {
            privacyLink: (chunks) => (
              <Link href="/privacy" className="underline underline-offset-4">
                {chunks}
              </Link>
            ),
          })}
        </p>
        {/* Phones: Accept stacked over Decline; sm+: one row, Decline then Accept. */}
        <div className="flex shrink-0 flex-col-reverse gap-1.5 sm:flex-row sm:gap-2">
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
