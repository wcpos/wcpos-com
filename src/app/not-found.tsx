'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import {
  browserLanguagePreferences,
  rootFallbackCopy,
  rootFallbackHref,
} from '@/lib/root-fallback-i18n'

function subscribeToLanguagePreferences() {
  return () => {}
}

function noLanguagePreferences() {
  return undefined
}

/**
 * Root 404 boundary of last resort.
 *
 * In practice almost every 404 renders src/app/[locale]/not-found.tsx
 * instead: the [locale]/[...rest] catch-all plus the group layouts/pages
 * (via resolveLocale) reject unknown URLs inside the [locale] boundary —
 * including middleware-excluded dotted paths like /nonexistent.xyz, which
 * land in [locale] with an invalid locale and are 404ed by the group
 * layouts. Do NOT route invalid locales here by throwing notFound() from
 * the [locale] layout: with cacheComponents, a production layout-level
 * notFound() escapes this boundary and 500s (see resolveLayoutLocale in
 * src/i18n/resolve-locale.ts and e2e/not-found.spec.ts).
 *
 * The root layout does not render <html>/<body> (the [locale] layout
 * does), so this page must provide its own document shell. Inline styles
 * keep it independent of the locale-scoped theming/fonts.
 */
export default function RootNotFound() {
  const languagePreferences = useSyncExternalStore(
    subscribeToLanguagePreferences,
    browserLanguagePreferences,
    noLanguagePreferences
  )
  const copy = rootFallbackCopy(languagePreferences)
  const homeHref = rootFallbackHref(copy.locale, '/')

  return (
    <html lang={copy.locale} dir={copy.direction}>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          backgroundColor: '#fafafa',
          color: '#171717',
        }}
      >
        <main
          style={{ textAlign: 'center', padding: '2rem', maxWidth: '28rem' }}
        >
          <p
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
              color: '#737373',
              marginBottom: '0.25rem',
            }}
          >
            404
          </p>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
            }}
          >
            {copy.errors.notFoundTitle}
          </h1>
          <p style={{ color: '#525252', marginBottom: '1.5rem' }}>
            {copy.errors.notFoundDescription}
          </p>
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link
              href={homeHref}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                backgroundColor: '#171717',
                color: '#fafafa',
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              {copy.errors.goHome}
            </Link>
            <Link
              href={rootFallbackHref(copy.locale, '/pro')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid #d4d4d4',
                color: '#171717',
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              WCPOS Pro
            </Link>
            <Link
              href={rootFallbackHref(copy.locale, '/support')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid #d4d4d4',
                color: '#171717',
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              {copy.support}
            </Link>
          </div>
        </main>
      </body>
    </html>
  )
}
