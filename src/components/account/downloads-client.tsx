'use client'

import { useEffect, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateForLocale } from '@/lib/date-format'

interface DownloadRelease {
  version: string
  name: string
  releaseNotes: string
  publishedAt: string
  allowed: boolean
}

export function DownloadsClient() {
  const locale = useLocale()
  const [releases, setReleases] = useState<DownloadRelease[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingVersion, setDownloadingVersion] = useState<string | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadReleases = async () => {
      setError(null)
      try {
        const response = await fetch('/api/account/downloads')
        if (!response.ok) {
          throw new Error('Failed to load plugin versions')
        }
        const data = await response.json()
        setReleases(data.releases || [])
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load plugin versions'
        )
      } finally {
        setLoading(false)
      }
    }

    loadReleases()
  }, [])

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
        throw new Error('Download is not available for this version')
      }

      const data = await response.json()
      window.location.href = data.downloadUrl
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to start download'
      )
    } finally {
      setDownloadingVersion(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
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
            <div className="space-y-3">
              {releases.map((release) => (
                <div
                  key={release.version}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{release.name}</p>
                    <p className="text-sm text-muted-foreground">
                      v{release.version} •{' '}
                      {formatDateForLocale(release.publishedAt, locale)}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                      {release.releaseNotes?.trim() || 'No release notes yet.'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={release.allowed ? 'default' : 'outline'}
                    disabled={!release.allowed || downloadingVersion === release.version}
                    onClick={() => startDownload(release.version)}
                  >
                    {downloadingVersion === release.version ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
