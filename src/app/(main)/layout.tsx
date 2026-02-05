import { SiteHeader } from '@/components/main/site-header'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  )
}
