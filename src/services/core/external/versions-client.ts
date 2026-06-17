import 'server-only'

import { cacheLife } from 'next/cache'
import { infraLogger } from '@/lib/logger'

/**
 * Versions Client
 *
 * Reads the public, aggregated version feed served by the WCPOS updates
 * server (https://updates.wcpos.com/api/versions). The feed is the single
 * source of truth for the latest version of every product surface (free
 * plugin, Pro plugin, desktop app, POS core, iOS, Android).
 *
 * Cached with Next.js 'use cache' on the 'api-short' profile, mirroring
 * github-client.ts — the feed changes at most a few times a day.
 */

const VERSIONS_URL = 'https://updates.wcpos.com/api/versions'

/** Labels the updates feed uses, in feed order. */
export const PRODUCT_LABELS = {
  free: 'WordPress Plugin (Free)',
  pro: 'WordPress Plugin (Pro)',
  desktop: 'Desktop App',
  core: 'POS App (React Native Core)',
  ios: 'iOS App',
  android: 'Android App',
} as const

export interface ProductVersion {
  label: string
  version: string | null
  releaseDate: string | null
  updateMethod: string
  link: string | null
  linkText: string | null
  note: string | null
}

async function fetchProductVersions(): Promise<ProductVersion[]> {
  'use cache'
  cacheLife('api-short')

  const res = await fetch(VERSIONS_URL)
  if (!res.ok) {
    throw new Error(`Versions feed responded ${res.status}`)
  }
  const json = (await res.json()) as { data?: ProductVersion[] }
  return Array.isArray(json.data) ? json.data : []
}

/**
 * Latest version of every product surface. Returns an empty array if the
 * feed is unreachable so callers can fall back to static copy.
 */
export async function getProductVersions(): Promise<ProductVersion[]> {
  try {
    return await fetchProductVersions()
  } catch (error) {
    infraLogger.error`Failed to fetch product versions: ${error}`
    return []
  }
}

/** Pick one product's version entry by its feed label. */
export function selectVersion(
  versions: ProductVersion[],
  label: string,
): ProductVersion | null {
  return versions.find((v) => v.label === label) ?? null
}

/** Convenience: the version string for a product, or null. */
export function versionFor(
  versions: ProductVersion[],
  label: string,
): string | null {
  return selectVersion(versions, label)?.version ?? null
}
