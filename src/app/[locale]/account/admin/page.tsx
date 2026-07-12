import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { getSessionCustomer } from '@/lib/medusa-auth'
import { isAdmin } from '@/lib/admin'
import { AdminInspectForm } from './admin-inspect-form'

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

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-semibold">{t('title')}</h1>
      <p className="text-sm text-muted-foreground">
        {t('description')}
      </p>
      <AdminInspectForm
        locale={locale}
        submitLabel={t('submit')}
        emailPlaceholder="customer@example.com"
        errorMessages={{
          not_found: t('errors.not_found'),
          rate_limited: t('errors.rate_limited'),
          forbidden: t('errors.forbidden'),
        }}
      />
    </div>
  )
}
