import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getSessionCustomer } from '@/lib/medusa-auth'
import { isAdmin } from '@/lib/admin'
import { startImpersonationAction } from './actions'

export const metadata = { robots: { index: false, follow: false } }

export default async function AdminInspectPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'account.admin' })
  // Gate on the REAL session — never getCustomer (which could be a target).
  const session = await getSessionCustomer()
  if (!isAdmin(session?.email)) notFound()

  async function submit(formData: FormData) {
    'use server'
    const email = String(formData.get('email') ?? '')
    await startImpersonationAction({ email, locale })
    // On success the action redirects; a returned error re-renders this page.
    // (For inline error messaging, upgrade to useActionState in a follow-up.)
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-semibold">{t('title')}</h1>
      <p className="text-sm text-muted-foreground">
        {t('description')}
      </p>
      <form action={submit} className="flex gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="customer@example.com"
          className="flex-1 rounded-md border px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          {t('submit')}
        </button>
      </form>
    </div>
  )
}
