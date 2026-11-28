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

  // One line at desktop, the sentence above two side-by-side buttons on
  // phones. Decline and Accept are both outline: equal weight, and the
  // header's Get Pro stays the one filled button in view.
  return (
    <div
      role="region"
      aria-label={t('label')}
      data-consent-banner=""
      data-testid="consent-banner"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3 shadow-lg lg:py-2.5"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-center lg:gap-6">
        <p className="text-[13px] leading-snug text-muted-foreground lg:text-sm">
          {t.rich('message', {
            privacyLink: (chunks) => (
              <Link
                href="/privacy"
                className="text-foreground underline underline-offset-4"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
        <div className="grid shrink-0 grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 min-w-24 lg:h-8"
            onClick={() => decide('denied')}
          >
            {t('decline')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 min-w-24 lg:h-8"
            onClick={() => decide('granted')}
          >
            {t('accept')}
          </Button>
        </div>
      </div>
    </div>
  )
}
