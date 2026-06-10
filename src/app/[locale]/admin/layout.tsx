import { setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import type { Metadata } from 'next'

// Admin pages are private — keep them out of search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  // Server-side allowlist guard. Non-admins (or anyone when ADMIN_EMAILS is
  // unset) get a 404 — the admin area never reveals it exists.
  // Each admin page also calls requireAdmin() itself; never trust the client.
  await requireAdmin()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-white">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <span className="text-xl font-bold text-gray-900">WCPOS</span>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600">Admin</span>
          </div>
          <Link
            href="/account"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Back to account
          </Link>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="w-64 border-r">
          <AdminSidebar />
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
