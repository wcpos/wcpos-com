import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { getCustomer } from '@/lib/medusa-auth'
import { getDiscordLink } from '@/lib/discord/metadata'
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getClientProfileMetadata(
  metadata: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!isRecord(metadata)) return undefined
  const accountProfile = isRecord(metadata.account_profile)
    ? metadata.account_profile
    : undefined

  return {
    oauth_avatar_url: metadata.oauth_avatar_url,
    avatar_url: metadata.avatar_url,
    avatarUrl: metadata.avatarUrl,
    picture: metadata.picture,
    image: metadata.image,
    image_url: metadata.image_url,
    photo_url: metadata.photo_url,
    profile_image_url: metadata.profile_image_url,
    account_profile: accountProfile
      ? {
          avatarDataUrl: accountProfile.avatarDataUrl,
          avatarUrl: accountProfile.avatarUrl,
          countryCode: accountProfile.countryCode,
          addressLine1: accountProfile.addressLine1,
          addressLine2: accountProfile.addressLine2,
          city: accountProfile.city,
          region: accountProfile.region,
          postalCode: accountProfile.postalCode,
          taxNumber: accountProfile.taxNumber,
        }
      : undefined,
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

  return (
    <ProfileEditForm
      customer={{
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: customer.phone,
        metadata: getClientProfileMetadata(customer.metadata),
      }}
      memberSince={formatDateForLocale(customer.created_at, locale)}
      connections={{
        google: { email: customer.email },
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
