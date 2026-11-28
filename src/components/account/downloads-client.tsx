'use client'

import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Lock,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { AccountNotice } from '@/components/account/account-notice'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { toneSurface, toneText } from '@/components/ui/status-tone'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Markdown } from '@/components/ui/markdown'
import { Separator } from '@/components/ui/separator'
import { formatDateForLocale } from '@/lib/date-format'

interface DownloadRelease {
  version: string
  name: string
  releaseNotes: string
  contentLocale?: string
  publishedAt: string
  allowed: boolean
}

export interface DownloadAccess {
  hasActiveLicense: boolean
  latestExpiry: string | null
  /**
   * True only when latestExpiry is in the past. The UI may only claim a
   * license "expired" when this is set — a suspended license can carry a
   * future expiry.
   */
  expiryHasPassed: boolean
  licenseCount: number
  suspendedCount: number
  /** Permanently terminated licenses (refund granted, fraud). */
  revokedCount: number
  /** Licenses we could not verify (Keygen unreachable or legacy key). */
  unknownCount: number
}

interface DownloadsClientProps {
  initialReleases: DownloadRelease[]
  access: DownloadAccess
  /**
   * Already-translated plan label ("Yearly"/"Lifetime") of the licence backing
   * the latest build, or null when no active licence entitles it or the plan is
   * unrecognized. The page resolves this server-side; the client never sees
   * policy ids.
   */
  entitlingPlanLabel?: string | null
  /**
   * True while the account-wide expiry banner (and its filled Renew) shows:
   * the latest build's Download then draws outline (one filled button per
   * view).
   */
  expiryBannerShown?: boolean
}

const RELEASES_PER_PAGE = 10


type DownloadTokenErrorCode =
  | 'unauthorized'
  | 'download_token_secret_missing'
  | 'rate_limited'
  | 'release_not_found'
  | 'forbidden'
  | 'internal'

const DOWNLOAD_TOKEN_ERROR_CODES = new Set<string>([
  'unauthorized',
  'download_token_secret_missing',
  'rate_limited',
  'release_not_found',
  'forbidden',
  'internal',
])

function isDownloadTokenErrorCode(value: unknown): value is DownloadTokenErrorCode {
  return typeof value === 'string' && DOWNLOAD_TOKEN_ERROR_CODES.has(value)
}

/** "2.0.5" → "2.0": the version line a release is grouped under. */
function versionLine(version: string): string {
  return version.replace(/^v/i, '').split('.').slice(0, 2).join('.')
}

/**
 * One plain line from markdown release notes for the archive row: the first
 * line that is not a heading, with list markers, emphasis and link targets
 * stripped. The full notes stay one click away in the modal.
 */
function noteSummary(markdown: string): string {
  for (const raw of markdown.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    return line
      .replace(/^([-*+>]|\d+\.)\s+/, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*_`]/g, '')
  }
  return ''
}

/** Major releases (x.0.0) get a marker in the archive, matching the mockup. */
function isMajorRelease(version: string): boolean {
  return /^\d+\.0\.0$/.test(version.replace(/^v/i, ''))
}

export function DownloadsClient({
  initialReleases,
  access,
  entitlingPlanLabel = null,
  expiryBannerShown = false,
}: DownloadsClientProps) {
  const locale = useLocale()
  const t = useTranslations('account.downloads')
  const tCommon = useTranslations('common')
  const releases = initialReleases
  const [currentPage, setCurrentPage] = useState(1)
  const [downloadingVersion, setDownloadingVersion] = useState<string | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  // The release whose notes are open in the modal, or null when closed.
  const [notesRelease, setNotesRelease] = useState<DownloadRelease | null>(null)

  // Releases arrive sorted newest-first; the first one is the "Latest" build.
  const latestRelease = releases[0]
  const latestVersion = latestRelease?.version
  const hasExternalEnglishContent =
    locale.split('-')[0]?.toLowerCase() !== 'en' &&
    releases.some((release) => release.contentLocale === 'en')
  const totalPages = Math.max(1, Math.ceil(releases.length / RELEASES_PER_PAGE))
  // Derive the clamped page instead of syncing state in an effect.
  const safePage = Math.min(currentPage, totalPages)
  const visibleReleases = releases.slice(
    (safePage - 1) * RELEASES_PER_PAGE,
    safePage * RELEASES_PER_PAGE
  )

  const noLicense = access.licenseCount === 0
  const inactiveAccess = !access.hasActiveLicense && access.licenseCount > 0
  // One banner per state, in order of how definitive the diagnosis is:
  // a passed expiry is a fact; suspension and unverifiability are status-based.
  const expiredAccess =
    inactiveAccess && access.expiryHasPassed && access.latestExpiry !== null
  const suspendedAccess =
    inactiveAccess && !expiredAccess && access.suspendedCount > 0
  const revokedAccess =
    inactiveAccess &&
    !expiredAccess &&
    !suspendedAccess &&
    access.revokedCount > 0
  const unknownAccess =
    inactiveAccess &&
    !expiredAccess &&
    !suspendedAccess &&
    !revokedAccess &&
    access.unknownCount > 0
  const inactiveFallback =
    inactiveAccess &&
    !expiredAccess &&
    !suspendedAccess &&
    !revokedAccess &&
    !unknownAccess

  const getDownloadTokenErrorMessage = (errorCode: DownloadTokenErrorCode) => {
    switch (errorCode) {
      case 'unauthorized':
        return t('apiErrors.unauthorized')
      case 'download_token_secret_missing':
        return t('apiErrors.download_token_secret_missing')
      case 'rate_limited':
        return t('apiErrors.rate_limited')
      case 'release_not_found':
        return t('apiErrors.release_not_found')
      case 'forbidden':
        return t('apiErrors.forbidden')
      case 'internal':
        return t('apiErrors.internal')
    }
  }

  // Per-release reason a build is unavailable. Mirrors the active banner so the
  // copy never misattributes the cause (e.g. claims "expired" for unverifiable).
  const blockedReason = expiredAccess
    ? null
    : unknownAccess
      ? t('reasonUnknown')
      : t('reasonInactive')

  const startDownload = async (version: string) => {
    setDownloadingVersion(version)
    setError(null)

    try {
      const response = await fetch('/api/account/downloads/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        const message = isDownloadTokenErrorCode(payload.errorCode)
          ? getDownloadTokenErrorMessage(payload.errorCode)
          : t('tokenErrorFallback')
        throw new Error(message)
      }

      const data = await response.json()
      window.location.assign(data.downloadUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('startErrorFallback'))
    } finally {
      setDownloadingVersion(null)
    }
  }

  const downloadLabel = (release: DownloadRelease) =>
    !release.allowed
      ? t('unavailable')
      : downloadingVersion === release.version
        ? t('preparing')
        : t('download')

  const hasNotes = (release: DownloadRelease) =>
    Boolean(release.releaseNotes?.trim())

  const latestAvailabilityLabel = access.hasActiveLicense
    ? entitlingPlanLabel
      ? t('availableOnPlan', { plan: entitlingPlanLabel })
      : t('availableOnActive')
    : null

  return (
    <div className="space-y-6">
      {error && (
        <Alert tone="critical" role="alert">
          {error}
        </Alert>
      )}

      {hasExternalEnglishContent && (
        <p className="text-center text-xs text-muted-foreground">
          {t('externalContentNotice')}
        </p>
      )}

      {expiredAccess && access.latestExpiry && (
        <AccountNotice
          action={
            <Button asChild size="sm">
              <Link href="/pro">{t('renewLicense')}</Link>
            </Button>
          }
        >
          {t.rich('expiredBanner', {
            date: formatDateForLocale(access.latestExpiry, locale),
            b: (chunks) => <b className="font-semibold">{chunks}</b>,
          })}
        </AccountNotice>
      )}

      {suspendedAccess && (
        <AccountNotice
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/support">{t('contactSupport')}</Link>
            </Button>
          }
        >
          {t('suspendedBanner')}
        </AccountNotice>
      )}

      {revokedAccess && (
        <AccountNotice
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/support">{t('contactSupport')}</Link>
            </Button>
          }
        >
          {t('revokedBanner')}
        </AccountNotice>
      )}

      {unknownAccess && (
        <AccountNotice
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/support">{t('contactSupport')}</Link>
            </Button>
          }
        >
          {t('unknownBanner')}
        </AccountNotice>
      )}

      {inactiveFallback && (
        <AccountNotice
          action={
            <Button asChild size="sm">
              <Link href="/pro">{t('renewLicense')}</Link>
            </Button>
          }
        >
          {t('inactiveBanner')}
        </AccountNotice>
      )}

      {noLicense && (
        <AccountNotice
          variant="neutral"
          action={
            <Button asChild size="sm">
              <Link href="/pro">{t('getPro')}</Link>
            </Button>
          }
        >
          {t('noLicenseBanner')}
        </AccountNotice>
      )}

      {/* Latest version hero — the build most customers want, surfaced first.
          Only shown when the latest build is actually installable: a blocked
          latest release would duplicate the archive's locked row (and the page
          banner already explains the lapse). */}
      {latestRelease && latestRelease.allowed && (
        <section className="grid items-center gap-x-8 gap-y-2 border-b pb-7 pt-2 md:grid-cols-[auto_minmax(0,1fr)_auto]">
          <p className="text-[56px] font-semibold leading-[56px] tracking-[-0.04em] tabular-nums">
            {latestRelease.version}
          </p>
          <div>
            <p className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
              <Badge variant="brand-tint">{t('latestBadge')}</Badge>
              {t('releasedOn', {
                date: formatDateForLocale(latestRelease.publishedAt, locale),
              })}
            </p>
            <div className="mt-1.5" lang={latestRelease.contentLocale}>
              {hasNotes(latestRelease) ? (
                <Markdown
                  className="line-clamp-3 max-w-[56ch] text-sm"
                  content={latestRelease.releaseNotes}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('noReleaseNotes')}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:flex-col md:items-stretch">
            <Button
              variant={expiryBannerShown ? 'outline' : 'default'}
              disabled={downloadingVersion === latestRelease.version}
              onClick={() => startDownload(latestRelease.version)}
            >
              <Download />
              {downloadingVersion === latestRelease.version
                ? t('preparing')
                : t('downloadVersion', { version: latestRelease.version })}
            </Button>
            {hasNotes(latestRelease) && (
              <Button
                variant="outline"
                onClick={() => setNotesRelease(latestRelease)}
              >
                <FileText />
                {t('releaseNotes')}
              </Button>
            )}
            {latestAvailabilityLabel && (
              <p className="text-center text-xs text-muted-foreground">
                {latestAvailabilityLabel}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Version history, newest first, grouped by version line. */}
      {releases.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('emptyList')}</p>
      ) : (
        <div>
          {visibleReleases.map((release, index) => {
            const previous = visibleReleases[index - 1]
            const line = versionLine(release.version)
            // On an expired licence, one caution line sits between the last
            // locked and the first downloadable version.
            const showCut =
              expiredAccess &&
              access.latestExpiry &&
              release.allowed &&
              previous !== undefined &&
              !previous.allowed
            return (
              <div key={release.version}>
                {(!previous || versionLine(previous.version) !== line) && (
                  <p className="mt-7 border-b pb-2 text-[13px] font-semibold text-muted-foreground first:mt-0">
                    WCPOS Pro {line}
                  </p>
                )}
                {showCut && (
                  <p
                    className={`my-2 flex items-center gap-2.5 rounded-md px-3.5 py-3 text-[13px] leading-[19px] ${toneSurface.caution}`}
                  >
                    <Lock aria-hidden="true" className="size-4 shrink-0" />
                    <span>
                      {t.rich('reasonExpired', {
                        date: formatDateForLocale(
                          access.latestExpiry as string,
                          locale
                        ),
                        locked: previous.version,
                        allowed: release.version,
                        b: (chunks) => <b className="font-semibold">{chunks}</b>,
                      })}
                    </span>
                  </p>
                )}
                <div
                  data-testid="release-row"
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-1 border-b py-3 text-sm md:grid-cols-[120px_130px_minmax(0,1fr)_auto]"
                >
                  {/* The release name stays in the row (screen readers and
                      the e2e row selector read it); the version is shown. */}
                  <span className="sr-only">{release.name}</span>
                  <span
                    className={`flex items-center gap-1.5 font-semibold ${
                      release.allowed ? '' : 'text-muted-foreground'
                    }`}
                  >
                    {!release.allowed && (
                      <Lock
                        aria-hidden="true"
                        className={`size-4 ${toneText.caution}`}
                      />
                    )}
                    {release.version}
                    {release.version === latestVersion && (
                      <Badge variant="brand-tint">{t('latestBadge')}</Badge>
                    )}
                    {isMajorRelease(release.version) && (
                      <Badge variant="muted-tint">{t('majorBadge')}</Badge>
                    )}
                  </span>
                  <span className="col-start-1 row-start-2 text-[13px] tabular-nums text-muted-foreground md:col-start-auto md:row-start-auto">
                    {formatDateForLocale(release.publishedAt, locale, {
                      dateStyle: 'medium',
                    })}
                  </span>
                  {!release.allowed && blockedReason ? (
                    <span className={`col-span-full text-[13px] md:col-span-1 ${toneText.caution}`}>
                      {blockedReason}
                    </span>
                  ) : (
                    <span className="hidden truncate text-[13px] text-muted-foreground md:block">
                      {noteSummary(release.releaseNotes ?? '')}
                    </span>
                  )}
                  <span className="col-start-2 row-span-2 row-start-1 flex justify-end gap-1 md:col-start-auto md:row-span-1 md:row-start-auto">
                    {hasNotes(release) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setNotesRelease(release)}
                      >
                        <FileText />
                        {t('notes')}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        !release.allowed ||
                        downloadingVersion === release.version
                      }
                      onClick={() => startDownload(release.version)}
                    >
                      {release.allowed ? <Download /> : <Lock />}
                      {downloadLabel(release)}
                    </Button>
                  </span>
                </div>
              </div>
            )
          })}

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
              <p className="text-xs text-muted-foreground">
                {t('pageOf', { page: safePage, total: totalPages })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                  aria-label={t('previousPageAria')}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('previous')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, safePage + 1))
                  }
                  disabled={safePage === totalPages}
                  aria-label={t('nextPageAria')}
                >
                  {t('next')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Release-notes modal. Long changelogs scroll inside a bounded region
          so the dialog itself never exceeds the viewport. */}
      <Dialog
        open={notesRelease !== null}
        onOpenChange={(open) => {
          if (!open) setNotesRelease(null)
        }}
      >
        <DialogContent
          className="max-h-[85vh] sm:max-w-2xl"
          closeLabel={tCommon('close')}
        >
          <DialogHeader>
            <DialogTitle>{notesRelease?.name}</DialogTitle>
            {notesRelease && (
              <DialogDescription>
                v{notesRelease.version} •{' '}
                {formatDateForLocale(notesRelease.publishedAt, locale)}
              </DialogDescription>
            )}
          </DialogHeader>
          <Separator />
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            {notesRelease && hasNotes(notesRelease) ? (
              <div lang={notesRelease.contentLocale}>
                <Markdown
                  className="max-w-none space-y-2 break-words text-sm"
                  content={notesRelease.releaseNotes}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('noReleaseNotes')}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
