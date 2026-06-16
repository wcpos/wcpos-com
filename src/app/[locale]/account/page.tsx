import { redirect } from '@/i18n/navigation'

// The account area no longer has an Overview landing page; Licences is the
// home of the account. Bounce /account (and its locale variants, including
// the Discord OAuth return_to and post-login landing) to /account/licenses.
// A pure redirect is static — no auth read, so no Suspense boundary needed.
export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect({ href: '/account/licenses', locale })
}
