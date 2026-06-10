import Link from 'next/link'

/**
 * Root 404 page. Rendered for requests that never enter the [locale]
 * segment — e.g. paths excluded from the middleware matcher (paths
 * containing a dot) or an invalid locale rejected by the locale layout.
 *
 * The root layout does not render <html>/<body> (the [locale] layout
 * does), so this page must provide its own document shell. Inline styles
 * keep it independent of the locale-scoped theming/fonts.
 */
export default function RootNotFound() {
  return (
    <html lang="en">
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
        <main style={{ textAlign: 'center', padding: '2rem', maxWidth: '28rem' }}>
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Page not found
          </h1>
          <p style={{ color: '#525252', marginBottom: '1.5rem' }}>
            The page you are looking for does not exist or may have moved.
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
              href="/"
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
              Go to homepage
            </Link>
            <Link
              href="/pro"
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
              href="/support"
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
              Support
            </Link>
          </div>
        </main>
      </body>
    </html>
  )
}
