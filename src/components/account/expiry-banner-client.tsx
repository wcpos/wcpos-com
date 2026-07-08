'use client'

import { useState, useSyncExternalStore } from 'react'
import { CalendarClock, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { formatDateForLocale } from '@/lib/date-format'

/**
 * Account-wide "your Pro licence is expiring soon" banner (Phase 5).
 *
 * The server (AccountExpiryBanner) decides *whether* a licence is lapsing
 * within the 30-day window and passes the date; this client half owns
 * *presentation and dismissal*:
 *   - Dismissible per visit: an × hides it for the browsing session
 *     (sessionStorage, keyed by expiry so a renewal re-arms it), returning on
 *     the next visit until renewed.
 *   - Suppressed on /account/licenses, which already shows detailed per-card
 *     expiry notices — no duplicate Renew prompt on that page.
 *
 * The persisted-dismissal read goes through useSyncExternalStore so the server
 * and first client render agree (not-dismissed → visible), with no hydration
 * mismatch and no setState-in-effect: after hydration the store snapshot
 * reflects sessionStorage and hides an already-dismissed banner.
 */
export function ExpiryBannerClient({
  expiry,
  renewHref,
}: {
  expiry: string
  renewHref: string
}) {
  const pathname = usePathname()
  const t = useTranslations('account.licenses')
  const tc = useTranslations('common')
  const locale = useLocale()

  const persistedDismissed = useSyncExternalStore(
    subscribeNoop,
    () => readDismissed(expiry),
    () => false
  )
  const [locallyDismissed, setLocallyDismissed] = useState(false)

  const onLicensesPage = pathname.startsWith('/account/licenses')
  if (onLicensesPage || persistedDismissed || locallyDismissed) return null

  function dismiss() {
    try {
      sessionStorage.setItem(dismissKey(expiry), '1')
    } catch {
      // Ignore — dismissal is best-effort; local state still hides it now.
    }
    setLocallyDismissed(true)
  }

  return (
    <Alert
      tone="caution"
      className="mb-6"
      icon={<CalendarClock />}
      action={
        <div className="flex items-center gap-1">
          <Button asChild size="sm" variant="brand">
            <Link href={renewHref} prefetch={false}>
              {t('renew')}
            </Link>
          </Button>
          <button
            type="button"
            onClick={dismiss}
            aria-label={tc('dismiss')}
            className="rounded p-1 text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
          >
            <X className="size-4" />
          </button>
        </div>
      }
    >
      <p>
        {t('expiresSoonRenew', {
          date: formatDateForLocale(expiry, locale),
        })}
      </p>
      <Link
        href="/roadmap"
        prefetch={false}
        className="inline-block text-sm font-medium underline underline-offset-2 hover:no-underline"
      >
        {t('roadmapTeaser')} <span aria-hidden="true">→</span>
      </Link>
    </Alert>
  )
}

function dismissKey(expiry: string): string {
  return `wcpos:expiryBannerDismissed:${expiry}`
}

function readDismissed(expiry: string): boolean {
  try {
    return sessionStorage.getItem(dismissKey(expiry)) != null
  } catch {
    return false
  }
}

// Dismissal only changes via this tab's own button (which uses local state), so
// the external store needs no live subscription — a no-op unsubscribe is enough
// for useSyncExternalStore to read the initial persisted snapshot after mount.
function subscribeNoop(): () => void {
  return () => {}
}
