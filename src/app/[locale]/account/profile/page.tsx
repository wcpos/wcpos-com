import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { getCustomer } from '@/lib/medusa-auth'
import { getDiscordLink } from '@/lib/discord/metadata'
import { getPrimarySignInProvider } from '@/lib/auth-providers/metadata'
import { projectProfileMetadataForClient } from '@/lib/customer-profile-metadata'
import { isDiscordConfigured } from '@/lib/discord/config'
import { formatDateForLocale } from '@/lib/date-format'
import { redirectToLoginClearingSession } from '@/lib/login-redirect'
import { Card, CardContent } from '@/components/ui/card'
import { ProfileEditForm } from '@/components/account/profile-edit-form'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'account.meta' })
  return {
    title: t('profile.title'),
    description: t('profile.description'),
  }
}

async function ProfileContent({ locale }: { locale: string }) {
  const customer = await getCustomer()

  if (!customer) {
    // `return` is needed for TypeScript narrowing: next-intl's redirect is
    // typed via an inferred destructured export, so its `never` return type
    // does not narrow `customer` the way next/navigation's redirect does.
    return redirectToLoginClearingSession(locale)
  }

  const discordLink = getDiscordLink(customer.metadata)
  const discordConfigured = isDiscordConfigured()
  // Show the real sign-in provider rather than assuming Google for everyone —
  // the most recently used Google/GitHub sign-in (so multi-linked accounts
  // attribute correctly), falling back to email/password. Discord has its own
  // role-sync row below.
  const signInProvider =
    getPrimarySignInProvider(customer.metadata) ?? 'email'

  return (
    <ProfileEditForm
      customer={{
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: customer.phone,
        metadata: projectProfileMetadataForClient(customer.metadata),
      }}
      memberSince={formatDateForLocale(customer.created_at, locale)}
      connections={{
        signIn: { provider: signInProvider, email: customer.email },
        discord: discordLink
          ? { connected: true, username: discordLink.username }
          : { connected: false, configured: discordConfigured },
        discordReturnTo: `/${locale}/account/profile`,
      }}
    />
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 py-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams?: Promise<{ discord?: string }>
}) {
  const { locale } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'account.profile' })
  const discordStatus = resolvedSearchParams.discord
  const discordStatusKey =
    discordStatus === 'linked' ||
    discordStatus === 'unlinked' ||
    discordStatus === 'synced' ||
    discordStatus === 'join_server' ||
    discordStatus === 'already_linked' ||
    discordStatus === 'error'
      ? discordStatus
      : null

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{t('heading')}</h1>
        <p className="text-sm text-muted-foreground">{t('lede')}</p>
      </div>
      {discordStatusKey && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          {t(`discordStatus.${discordStatusKey}`)}
        </div>
      )}
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent locale={locale} />
      </Suspense>
    </div>
  )
}
