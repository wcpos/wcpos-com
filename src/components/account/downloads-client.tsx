'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Markdown } from '@/components/ui/markdown'
import { formatDateForLocale } from '@/lib/date-format'

interface DownloadRelease {
  version: string
  name: string
  releaseNotes: string
  publishedAt: string
  allowed: boolean
}

export interface DownloadAccess {
  hasActiveLicense: boolean
  latestExpiry: string | null
  licenseCount: number
}

interface DownloadsClientProps {
  initialReleases: DownloadRelease[]
  access: DownloadAccess
}

const RELEASES_PER_PAGE = 10

export function DownloadsClient({
  initialReleases,
  access,
}: DownloadsClientProps) {
  const locale = useLocale()
  const releases = initialReleases
  const [currentPage, setCurrentPage] = useState(1)
  const [downloadingVersion, setDownloadingVersion] = useState<string | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(releases.length / RELEASES_PER_PAGE))
  // Derive the clamped page instead of syncing state in an effect.
  const safePage = Math.min(currentPage, totalPages)
  const visibleReleases = releases.slice(
    (safePage - 1) * RELEASES_PER_PAGE,
    safePage * RELEASES_PER_PAGE
  )

  const expiredAccess = !access.hasActiveLicense && access.licenseCount > 0
  const noLicense = access.licenseCount === 0

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
        const message =
          typeof payload.error === 'string'
            ? payload.error
            : 'Download is not available for this version'
        throw new Error(message)
      }

      const data = await response.json()
      window.location.assign(data.downloadUrl)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to start download'
      )
    } finally {
      setDownloadingVersion(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {expiredAccess && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p>
            {access.latestExpiry
              ? `Your license expired on ${formatDateForLocale(
                  access.latestExpiry,
                  locale
                )}. You can still download versions released before then.`
              : 'You have no active license. Only versions released during your license term are available.'}
          </p>
          <Button asChild size="sm">
            <Link href="/pro">Renew license</Link>
          </Button>
        </div>
      )}

      {noLicense && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted p-3 text-sm">
          <p>A WCPOS Pro license is required to download the plugin.</p>
          <Button asChild size="sm">
            <Link href="/pro">Get WCPOS Pro</Link>
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">WCPOS Pro Downloads</CardTitle>
        </CardHeader>
        <CardContent>
          {releases.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No downloadable versions were found.
            </p>
          ) : (
            <div className="space-y-4">
              {visibleReleases.map((release) => (
                <div
                  key={release.version}
                  className={`flex items-start justify-between gap-4 rounded-lg border p-3 ${
                    release.allowed ? '' : 'opacity-60'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-medium">{release.name}</p>
                    <p className="text-sm text-muted-foreground">
                      v{release.version} •{' '}
                      {formatDateForLocale(release.publishedAt, locale)}
                    </p>
                    {!release.allowed && (
                      <p className="mt-1 text-xs text-amber-700">
                        {expiredAccess && access.latestExpiry
                          ? 'Released after your license expired.'
                          : 'Requires an active license.'}
                      </p>
                    )}
                    {release.releaseNotes?.trim() ? (
                      <Markdown
                        className="mt-2 space-y-1"
                        content={release.releaseNotes}
                      />
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        No release notes yet.
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={release.allowed ? 'default' : 'outline'}
                    disabled={!release.allowed || downloadingVersion === release.version}
                    onClick={() => startDownload(release.version)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {!release.allowed
                      ? 'Unavailable'
                      : downloadingVersion === release.version
                        ? 'Preparing...'
                        : 'Download'}
                  </Button>
                </div>
              ))}

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-3">
                  <p className="text-xs text-muted-foreground">
                    Page {safePage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                      disabled={safePage === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, safePage + 1))
                      }
                      disabled={safePage === totalPages}
                      aria-label="Next page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
