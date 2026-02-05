import { setRequestLocale } from 'next-intl/server'
import { SiteHeader } from '@/components/main/site-header'
import { SiteFooter } from '@/components/main/site-footer'

export default async function MainLayout({
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
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  )
}
