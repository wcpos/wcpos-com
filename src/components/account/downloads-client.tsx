'use client'

import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { AccountNotice } from '@/components/account/account-notice'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { DividedList, Row } from '@/components/ui/row'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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

/** Major releases (x.0.0) get a marker in the archive, matching the mockup. */
function isMajorRelease(version: string): boolean {
  return /^\d+\.0\.0$/.test(version.replace(/^v/i, ''))
}

export function DownloadsClient({
  initialReleases,
  access,
  entitlingPlanLabel = null,
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
    ? t('reasonExpired')
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
          {t('expiredBanner', {
            date: formatDateForLocale(access.latestExpiry, locale),
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
          latest release would duplicate the archive's "Unavailable" row (and
          the page banner already explains the lapse). */}
      {latestRelease && latestRelease.allowed && (
        <Card>
          <CardHeader className="gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('latestVersionLabel')}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl">{latestRelease.name}</CardTitle>
              <Badge variant="default">{t('latestBadge')}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              v{latestRelease.version} •{' '}
              {formatDateForLocale(latestRelease.publishedAt, locale)}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasNotes(latestRelease) ? (
              <div lang={latestRelease.contentLocale}>
                <Markdown
                  className="line-clamp-3 max-w-prose text-sm text-muted-foreground"
                  content={latestRelease.releaseNotes}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('noReleaseNotes')}
              </p>
            )}

            {latestAvailabilityLabel && (
              <p className="text-sm font-medium text-foreground">
                {latestAvailabilityLabel}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                disabled={downloadingVersion === latestRelease.version}
                onClick={() => startDownload(latestRelease.version)}
              >
                <Download className="mr-2 h-4 w-4" />
                {downloadLabel(latestRelease)}
              </Button>
              {hasNotes(latestRelease) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setNotesRelease(latestRelease)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {t('releaseNotes')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Version history — the full changelog archive. */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <CardTitle className="text-lg">{t('listTitle')}</CardTitle>
            {releases.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {t('releaseCount', { count: releases.length })}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {releases.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('emptyList')}</p>
          ) : (
            <>
              <DividedList>
                {visibleReleases.map((release) => (
                  <Row
                    key={release.version}
                    data-testid="release-row"
                    className={`items-start gap-3 ${
                      release.allowed ? '' : 'opacity-60'
                    }`}
                  >
                  <div className="min-w-0 flex-1 basis-60">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{release.name}</p>
                      {release.version === latestVersion && (
                        <Badge variant="default">{t('latestBadge')}</Badge>
                      )}
                      {isMajorRelease(release.version) && (
                        <Badge variant="secondary">{t('majorBadge')}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      v{release.version} •{' '}
                      {formatDateForLocale(release.publishedAt, locale)}
                    </p>
                    {!release.allowed && (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                        {blockedReason}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {hasNotes(release) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setNotesRelease(release)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        {t('releaseNotes')}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={release.allowed ? 'default' : 'outline'}
                      disabled={
                        !release.allowed ||
                        downloadingVersion === release.version
                      }
                      onClick={() => startDownload(release.version)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {downloadLabel(release)}
                    </Button>
                  </div>
                </Row>
                ))}
              </DividedList>

              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
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
            </>
          )}
        </CardContent>
      </Card>

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
