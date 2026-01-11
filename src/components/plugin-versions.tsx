'use client'

import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'

interface PluginVersion {
  free: string | null
  pro: string | null
}

export function PluginVersions() {
  const [versions, setVersions] = useState<PluginVersion>({ free: null, pro: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchVersions() {
      try {
        const response = await fetch('/api/plugin-versions')
        if (!response.ok) {
          throw new Error('Failed to fetch plugin versions')
        }
        const data = await response.json()
        setVersions(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchVersions()
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Plugin Versions</h2>
        <div className="animate-pulse">
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Plugin Versions</h2>
        <p className="text-red-600">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">Plugin Versions</h2>
      <div className="space-y-4">
        <a
          href="https://wordpress.org/plugins/woocommerce-pos/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div>
            <h3 className="font-semibold text-lg">WooCommerce POS (Free)</h3>
            <p className="text-gray-600">
              {versions.free ? `Version ${versions.free}` : 'Loading version...'}
            </p>
          </div>
          <ExternalLink className="w-5 h-5 text-gray-400" />
        </a>

        <a
          href="/pro"
          className="flex items-center justify-between p-4 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <div>
            <h3 className="font-semibold text-lg">WooCommerce POS Pro</h3>
            <p className="text-gray-600">
              {versions.pro ? `Version ${versions.pro}` : 'Premium version available'}
            </p>
          </div>
          <ExternalLink className="w-5 h-5 text-blue-600" />
        </a>
      </div>
    </div>
  )
}