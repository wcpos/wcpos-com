import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ClientSpeedInsights } from '@/components/client-speed-insights'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { ThemeProvider } from 'next-themes'
import { Suspense } from 'react'
import { localeDirections, locales, type Locale } from '@/i18n/config'
import { clientMessages } from '@/i18n/client-messages'
import { ClientLoggingInit } from '@/components/client-logging-init'
import { ConsentBanner } from '@/components/consent/consent-banner'
import { ANALYTICS_CONSENT_BOOTSTRAP_SCRIPT } from '@/lib/analytics/consent'
import { alternateOpenGraphLocales, openGraphLocale } from '@/lib/seo'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const localeKey = locale as Locale
  const t = await getTranslations({ locale: localeKey, namespace: 'metadata' })

  return {
    metadataBase: new URL('https://wcpos.com'),
    title: {
      template: '%s | WCPOS',
      default: t('siteTitle'),
    },
    description: t('siteDescription'),
    openGraph: {
      type: 'website',
      siteName: 'WCPOS',
      locale: openGraphLocale(localeKey),
      alternateLocale: alternateOpenGraphLocales(localeKey),
      images: ['/opengraph-image.png'],
      // og:image and twitter:image come from the static src/app/opengraph-image.png
      // file convention. It lives at the APP ROOT, not under [locale]: a static
      // metadata image inside a dynamic segment trips a Next.js cacheComponents
      // prerender bug (vercel/next.js#88043 — generateStaticParams is ignored for
      // opengraph-image), which fails the production build. The image is identical
      // across locales, so one root image is both correct and bug-free. Do not
      // move it back under [locale]. Regenerate it from scripts/og-image/
      // (see the README there) when branding or the tagline changes.
    },
    twitter: {
      card: 'summary_large_image',
      images: ['/opengraph-image.png'],
    },
  }
}

// Browser-chrome colour matching --background in globals.css for each scheme
// (next-themes defaults to system, so the media queries pick the right one).
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#020817' },
  ],
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params
  const localeKey = locale as Locale
  setRequestLocale(localeKey)
  const messages = await getMessages()

  return (
    <html lang={localeKey} dir={localeDirections[localeKey]} suppressHydrationWarning>
      <head>
        {/* Classify consent before the banner markup is parsed. This keeps the
            banner in the prerendered response without flashing it to visitors
            who already decided while the client bundle hydrates. */}
        <script
          dangerouslySetInnerHTML={{
            __html: ANALYTICS_CONSENT_BOOTSTRAP_SCRIPT,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'WCPOS',
              url: 'https://wcpos.com',
              logo: 'https://wcpos.com/icon.png',
              sameAs: ['https://github.com/wcpos'],
            }),
          }}
        />
        <ClientLoggingInit />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={clientMessages(messages)}>
            {children}
            <Suspense fallback={null}>
              <ConsentBanner />
            </Suspense>
          </NextIntlClientProvider>
        </ThemeProvider>
        {/* Real-user Core Web Vitals (Vercel Speed Insights). Cookieless and
            anonymous, so it is not gated behind the analytics consent. */}
        <ClientSpeedInsights />
      </body>
    </html>
  )
}
