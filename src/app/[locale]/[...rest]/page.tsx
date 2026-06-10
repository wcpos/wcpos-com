import { notFound } from 'next/navigation'

/**
 * Catch-all route for unknown URLs within a valid locale.
 *
 * next-intl's middleware rewrites unprefixed paths to the resolved locale
 * (e.g. /unknown -> /en/unknown), so unmatched paths land here and trigger
 * the localized not-found page at src/app/[locale]/not-found.tsx.
 *
 * See: https://next-intl.dev/docs/environments/error-files
 */
export default function CatchAllPage() {
  notFound()
}
