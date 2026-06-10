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
    default: 'WCPOS - WooCommerce Point of Sale',
  },
  description:
    'Point of Sale for WooCommerce. Fast, reliable POS system for your WooCommerce store.',
  openGraph: {
    type: 'website',
    siteName: 'WCPOS',
    // The file-convention opengraph-image at the app root is not inherited
    // into the [locale] tree, so reference the generated image explicitly.
    // Resolved against metadataBase: https://wcpos.com/opengraph-image
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'WCPOS - WooCommerce Point of Sale',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/opengraph-image'],
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
              logo: 'https://wcpos.com/opengraph-image',
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
