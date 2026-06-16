import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { getCustomer } from '@/lib/medusa-auth'
import { formatDateForLocale } from '@/lib/date-format'
import { isDiscordConfigured } from '@/lib/discord/config'
import { redirectToLoginClearingSession } from '@/lib/login-redirect'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ProfileDiscordControls,
  ProfileEditForm,
} from '@/components/account/profile-edit-form'
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

async function ProfileContent({
  discordStatus,
  locale,
}: {
  discordStatus?: string
  locale: string
}) {
  const [t, customer] = await Promise.all([
    getTranslations({ locale, namespace: 'account.profile' }),
    getCustomer(),
  ])

  if (!customer) {
    // `return` is needed for TypeScript narrowing: next-intl's redirect is
    // typed via an inferred destructured export, so its `never` return type
    // does not narrow `customer` the way next/navigation's redirect does.
    return redirectToLoginClearingSession(locale)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('cardTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ProfileEditForm
          customer={{
            email: customer.email,
            first_name: customer.first_name,
            last_name: customer.last_name,
            phone: customer.phone,
            metadata: customer.metadata,
          }}
        />
        <div className="flex justify-between border-t pt-3 text-sm">
          <span className="text-muted-foreground">{t('memberSince')}</span>
          <span>{formatDateForLocale(customer.created_at, locale)}</span>
        </div>
        <ProfileDiscordControls
          configured={isDiscordConfigured()}
          customerMetadata={customer.metadata}
          discordStatus={discordStatus}
          returnTo={`/${locale}/account/profile`}
        />
      </CardContent>
    </Card>
  )
}

function ProfileSkeleton() {
  return (
    <Card>
      <CardContent className="py-6 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between">
            <div className="h-5 w-24 bg-muted rounded animate-pulse" />
            <div className="h-5 w-32 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </CardContent>
    </Card>
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t('heading')}</h1>
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent
          discordStatus={resolvedSearchParams.discord}
          locale={locale}
        />
      </Suspense>
    </div>
  )
}
