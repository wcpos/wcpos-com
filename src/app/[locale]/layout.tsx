import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { ThemeProvider } from 'next-themes'
import { locales } from '@/i18n/config'
import { ClientLoggingInit } from '@/components/client-logging-init'
import { ConsentBanner } from '@/components/consent/consent-banner'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://wcpos.com'),
  title: {
    template: '%s | WCPOS',
    default: 'WCPOS - Point of Sale for WooCommerce',
  },
  description:
    'Point of Sale for WooCommerce. Fast, reliable POS system for your WooCommerce store.',
  openGraph: {
    type: 'website',
    siteName: 'WCPOS',
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
  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
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
          <NextIntlClientProvider messages={messages}>
            {children}
            <ConsentBanner />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
