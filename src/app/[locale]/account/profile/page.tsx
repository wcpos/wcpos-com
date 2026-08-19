import { getTranslations, setRequestLocale } from 'next-intl/server'
import { resolveLocale } from '@/i18n/resolve-locale'
import { Suspense } from 'react'
import { getCustomer } from '@/lib/medusa-auth'
import { getCustomerAuthMethods } from '@/lib/auth-methods'
import { getPrimarySignInProvider } from '@/lib/auth-providers/metadata'
import { projectProfileMetadataForClient } from '@/lib/customer-profile-metadata'
import { supportedBaseLocale } from '@/lib/locale-preferences'
import { billingDetailsFromCustomer } from '@/lib/billing-profile'
import { formatDateForLocale } from '@/lib/date-format'
import { redirectToLoginClearingSession } from '@/lib/login-redirect'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { ProfileEditForm } from '@/components/account/profile-edit-form'
import { DeleteAccountCard } from '@/components/account/delete-account-card'
import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const t = await getTranslations({ locale, namespace: 'account.meta' })
  return {
    title: t('profile.title'),
    description: t('profile.description'),
  }
}

async function ProfileContent({ locale }: { locale: Locale }) {
  // Independent requests: getCustomerAuthMethods() authenticates from the
  // session token itself rather than from `customer`, so awaiting them in
  // series would only double the round-trip latency.
  //
  // DB truth for the Connections card (null → backend without the
  // auth-methods endpoint yet; the card degrades to the metadata-derived
  // read-only display).
  const [customer, authMethods] = await Promise.all([
    getCustomer(),
    getCustomerAuthMethods(),
  ])

  if (!customer) {
    // `return` is needed for TypeScript narrowing: next-intl's redirect is
    // typed via an inferred destructured export, so its `never` return type
    // does not narrow `customer` the way next/navigation's redirect does.
    return redirectToLoginClearingSession(locale)
  }

  // Show the real sign-in provider rather than assuming Google for everyone —
  // the most recently used Google/GitHub sign-in (so multi-linked accounts
  // attribute correctly), falling back to email/password. Discord access is
  // managed per licence on the licences page.
  const signInProvider =
    getPrimarySignInProvider(customer.metadata) ?? 'email'

  // The language selector shows the saved preference, not the viewer's
  // locale. Validated here rather than widening the client metadata
  // projection, which stays avatar-only.
  const savedLocale =
    typeof customer.metadata?.locale === 'string'
      ? supportedBaseLocale(customer.metadata.locale)
      : undefined

  return (
    <div className="space-y-6">
      <ProfileEditForm
        // Same identity key as LicensesClient on the licences page: revisited
        // pages keep client state alive (back/forward), so an admin switching
        // "view as" targets would otherwise see the previous customer's form
        // state. A changed key forces a real remount.
        key={customer.id}
        customer={{
          email: customer.email,
          first_name: customer.first_name,
          last_name: customer.last_name,
          phone: customer.phone,
          metadata: projectProfileMetadataForClient(customer.metadata),
        }}
        billingDetails={billingDetailsFromCustomer(customer)}
        savedLocale={savedLocale}
        memberSince={formatDateForLocale(customer.created_at, locale)}
        connections={{
          signIn: { provider: signInProvider, email: customer.email },
          methods: authMethods
            ? {
                providers: authMethods.providers,
                providerDetails: authMethods.providerDetails,
                emailpassIdentifier: authMethods.emailpassIdentifier,
                emailpassPending: authMethods.emailpassPending,
                emailpassUpdatedAt: authMethods.emailpassUpdatedAt,
                emailpassReserved: authMethods.emailpassReserved,
              }
            : null,
        }}
      />
      <DeleteAccountCard email={customer.email} />
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 py-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = resolveLocale((await params).locale)
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'account.profile' })

  return (
    <div className="space-y-6">
      <PageHeader title={t('heading')} lede={t('lede')} />
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent locale={locale} />
      </Suspense>
    </div>
  )
}
