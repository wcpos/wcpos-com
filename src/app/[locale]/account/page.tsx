import { redirect } from '@/i18n/navigation'
import { resolveLocale } from '@/i18n/resolve-locale'

// The account area no longer has an Overview landing page; Licences is the
// home of the account. Bounce /account and its locale variants to
// /account/licenses.
// A pure redirect is static — no auth read, so no Suspense boundary needed.
export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = resolveLocale((await params).locale)
  redirect({ href: '/account/licenses', locale })
}
