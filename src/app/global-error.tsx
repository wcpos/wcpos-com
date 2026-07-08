'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { clientLogger } from '@/lib/client-logger'
import {
  browserLanguagePreferences,
  rootFallbackCopy,
} from '@/lib/root-fallback-i18n'

function subscribeToLanguagePreferences() {
  return () => {}
}

function noLanguagePreferences() {
  return undefined
}

/**
 * Last-resort error boundary. Renders when the root layout (or anything
 * above the locale boundary) throws. It must provide its own <html>/<body>
 * and uses inline styles only, because global CSS may not be available
 * when this renders.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Logging may not be configured yet if the app crashed during boot,
    // so always mirror to the console as well.
    console.error('Global error:', error)
    try {
      clientLogger.error`Global error: ${error.message} (digest: ${
        error.digest ?? 'none'
      })`
    } catch {
      // clientLogger unavailable — the console output above is the fallback.
    }
  }, [error])

  const languagePreferences = useSyncExternalStore(
    subscribeToLanguagePreferences,
    browserLanguagePreferences,
    noLanguagePreferences
  )
  const copy = rootFallbackCopy(languagePreferences)

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
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
            }}
          >
            {copy.errors.genericTitle}
          </h1>
          <p style={{ color: '#525252', marginBottom: '1.5rem' }}>
            {copy.errors.genericDescription}
          </p>
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={reset}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                backgroundColor: '#171717',
                color: '#fafafa',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {copy.errors.tryAgain}
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- intentional full reload: client app state is broken when the global boundary renders */}
            <a
              href="/"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid #d4d4d4',
                backgroundColor: 'transparent',
                color: '#171717',
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              {copy.errors.goHome}
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
