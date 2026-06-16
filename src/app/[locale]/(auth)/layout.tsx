import { setRequestLocale } from 'next-intl/server'
import { SiteHeader } from '@/components/main/site-header'
import { SiteFooter } from '@/components/main/site-footer'

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="relative flex flex-1 items-center justify-center px-4 py-12">
        {/* Soft radial glow echoing the homepage hero, both themes. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,hsl(var(--muted)),transparent)]"
        />
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
