'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

interface ReleaseInfo {
  version: string
  name: string
  assets: Array<{
    name: string
    browser_download_url: string
    size: number
  }>
  releaseDate: string
  notes: string
}

interface PlatformInfo {
  name: string
  platform: string
  icon: string
  extension: string
}

const PLATFORMS: PlatformInfo[] = [
  { name: 'macOS (Apple Silicon)', platform: 'darwin-arm64', icon: '🍎', extension: '.dmg' },
  { name: 'macOS (Intel)', platform: 'darwin-x64', icon: '🍎', extension: '.dmg' },
  { name: 'Windows', platform: 'win32-x64', icon: '🪟', extension: '.exe' },
  { name: 'Linux', platform: 'linux-x64', icon: '🐧', extension: '.AppImage' },
]

export function DesktopDownloads() {
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReleaseInfo() {
      try {
        const response = await fetch('/api/desktop-releases')
        if (!response.ok) {
          throw new Error('Failed to fetch release information')
        }
        const data = await response.json()
        setReleaseInfo(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchReleaseInfo()
  }, [])

  if (loading) {
    return (
      <div className="rounded-md border bg-card p-6">
        <h2 className="text-2xl font-bold mb-4">Desktop Applications</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border bg-card p-6">
        <h2 className="text-2xl font-bold mb-4">Desktop Applications</h2>
        <p className="text-destructive">Error: {error}</p>
      </div>
    )
  }

  if (!releaseInfo) {
    return null
  }

  const getDownloadUrl = (platform: string) => {
    const asset = releaseInfo.assets.find((a) => {
      if (platform === 'darwin-arm64') {
        return a.name.includes('arm64') && a.name.endsWith('.dmg')
      } else if (platform === 'darwin-x64') {
        return a.name.includes('x64') && a.name.endsWith('.dmg')
      } else if (platform === 'win32-x64') {
        return a.name.includes('Setup') && a.name.endsWith('.exe')
      } else if (platform === 'linux-x64') {
        return a.name.endsWith('.AppImage')
      }
      return false
    })
    return asset?.browser_download_url
  }

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const getFileSize = (platform: string) => {
    const asset = releaseInfo.assets.find((a) => {
      if (platform === 'darwin-arm64') {
        return a.name.includes('arm64') && a.name.endsWith('.dmg')
      } else if (platform === 'darwin-x64') {
        return a.name.includes('x64') && a.name.endsWith('.dmg')
      } else if (platform === 'win32-x64') {
        return a.name.includes('Setup') && a.name.endsWith('.exe')
      } else if (platform === 'linux-x64') {
        return a.name.endsWith('.AppImage')
      }
      return false
    })
    return asset ? formatFileSize(asset.size) : null
  }

  return (
    <div className="rounded-md border bg-card p-6">
      <h2 className="text-2xl font-bold mb-4">Desktop Applications</h2>
      <p className="text-muted-foreground mb-6">
        Version {releaseInfo.version} • Released{' '}
        {new Date(releaseInfo.releaseDate).toLocaleDateString()}
      </p>
      
      <div className="space-y-3">
        {PLATFORMS.map((platform) => {
          const downloadUrl = getDownloadUrl(platform.platform)
          const fileSize = getFileSize(platform.platform)
          
          if (!downloadUrl) return null
          
          return (
            <a
              key={platform.platform}
              href={downloadUrl}
              className="flex items-center justify-between p-4 border rounded-md hover:bg-muted transition-colors"
              download
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{platform.icon}</span>
                <div>
                  <p className="font-medium">{platform.name}</p>
                  {fileSize && (
                    <p className="text-sm text-muted-foreground">{fileSize}</p>
                  )}
                </div>
              </div>
              <Download className="w-5 h-5 text-muted-foreground" />
            </a>
          )
        })}
      </div>
      
      {releaseInfo.notes && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            Release Notes
          </summary>
          <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
            {releaseInfo.notes}
          </div>
        </details>
      )}
    </div>
  )
}