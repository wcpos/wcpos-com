import type { Metadata } from 'next'
import { Suspense } from 'react'
import { resolveLocale } from '@/i18n/resolve-locale'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { Laptop, Smartphone, Globe, ArrowRight, CloudOff } from 'lucide-react'
import { Section, Container } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { TextLink } from '@/components/ui/text-link'
import { Link } from '@/i18n/navigation'
import { TrackedLocaleLink } from '@/components/analytics/tracked-locale-link'
import { TrackedExternalLink } from '@/components/analytics/tracked-external-link'
import { localeUrl, marketingMetadata } from '@/lib/seo'
import { wcposSoftwareApplication } from '@/lib/software-application-json-ld'
import { formatDateForLocale } from '@/lib/date-format'
import { DownloadsHero } from '@/components/downloads/download-hero'
import { PLATFORMS, type PlatformKey } from '@/components/downloads/platforms'
import { HowItFits } from '@/components/downloads/how-it-fits'
import { ProPriceLine } from '@/components/downloads/pro-price-line'
import {
  GetStartedSteps,
  GetStartedStep,
} from '@/components/downloads/get-started-steps'
import {
  ReleaseHistory,
  type ReleaseEntry,
} from '@/components/downloads/release-history'
import { getReleases } from '@/services/core/external/github-client'
import { cleanReleaseNotes } from '@/lib/release-notes'
import {
  getProductVersions,
  versionFor,
  PRODUCT_LABELS,
} from '@/services/core/external/versions-client'
import { clientMessages } from '@/i18n/client-messages'
import { DOWNLOADS_CLIENT_MESSAGES } from '@/components/downloads/client-messages'

// Docs guide for installing the free plugin, which serves the web register from the store.
const WEB_SETUP_GUIDE_URL = 'https://docs.wcpos.com/getting-started/installation'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale)
  const t = await getTranslations({ locale, namespace: 'downloads.meta' })
  return marketingMetadata({
    locale,
    path: '/downloads',
    title: t('title'),
    description: t('description'),
  })
}

function formatReleaseDate(iso: string, locale: string): string {
  return formatDateForLocale(iso, locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

async function getRecentReleases(
  locale: string,
  t: Awaited<ReturnType<typeof getTranslations>>
): Promise<ReleaseEntry[]> {
  const releases = await getReleases('woocommerce-pos')
  const published = releases
    .filter((release) => !release.draft && !release.prerelease)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 6)

  return published.map((release, index) => {
    const body = cleanReleaseNotes(release.body, release.tagName)
    return {
      version: release.tagName.replace(/^v/, ''),
      date: formatReleaseDate(release.publishedAt, locale),
      body: body || t('emptyNotes'),
      contentLocale: body ? 'en' : locale,
      latest: index === 0,
    }
  })
}

function DeviceCard({
  icon: Icon,
  title,
  beta,
  betaLabel,
  children,
}: {
  icon: typeof Laptop
  title: string
  beta?: boolean
  betaLabel: string
  children: React.ReactNode
}) {
  return (
    <Card className="flex items-start gap-3 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="font-medium">
          {title}
          {beta && (
            <Badge variant="muted-tint" className="ml-2">
              {betaLabel}
            </Badge>
          )}
        </p>
        <div className="mt-1 text-sm text-muted-foreground">{children}</div>
      </div>
    </Card>
  )
}

export default async function DownloadsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = resolveLocale((await params).locale)
  setRequestLocale(locale)

  const [messages, metaT, pageT, platformT, releaseT, howItFitsT, versions] =
    await Promise.all([
      getMessages(),
      getTranslations({ locale, namespace: 'downloads.meta' }),
      getTranslations({ locale, namespace: 'downloads.page' }),
      getTranslations({ locale, namespace: 'downloads.platforms' }),
      getTranslations({ locale, namespace: 'downloads.releaseHistory' }),
      getTranslations({ locale, namespace: 'downloads.howItFits' }),
      getProductVersions(),
    ])
  const releases = await getRecentReleases(locale, releaseT)
  const desktopVersion = versionFor(versions, PRODUCT_LABELS.desktop)
  const freeVersion = versionFor(versions, PRODUCT_LABELS.free)
  const desktopLinks: PlatformKey[] = ['mac-arm', 'mac-intel', 'win', 'linux']

  return (
    <NextIntlClientProvider
      messages={clientMessages(messages, DOWNLOADS_CLIENT_MESSAGES)}
    >
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(wcposSoftwareApplication({
              url: localeUrl(locale, '/'),
              description: metaT('description'),
              downloadUrl: localeUrl(locale, '/downloads'),
              ...(freeVersion ? { softwareVersion: freeVersion } : {}),
            })),
          }}
        />
        <DownloadsHero desktopVersion={desktopVersion} />
        <HowItFits
          copy={{
            eyebrow: howItFitsT('eyebrow'),
            title: howItFitsT('title'),
            points: {
              setup: {
                title: howItFitsT('points.setup.title'),
                body: howItFitsT('points.setup.body'),
              },
              sync: {
                title: howItFitsT('points.sync.title'),
                body: howItFitsT('points.sync.body'),
              },
              offline: {
                title: howItFitsT('points.offline.title'),
                body: howItFitsT('points.offline.body'),
              },
            },
            syncLabel: howItFitsT('syncLabel'),
            chips: {
              c1: howItFitsT('chips.c1'),
              c2: howItFitsT('chips.c2'),
              c3: howItFitsT('chips.c3'),
              c4: howItFitsT('chips.c4'),
              c5: howItFitsT('chips.c5'),
            },
            diagram: {
              ariaLabel: howItFitsT('diagram.ariaLabel'),
              devices: {
                desktop: howItFitsT('diagram.devices.desktop'),
                ios: howItFitsT('diagram.devices.ios'),
                android: howItFitsT('diagram.devices.android'),
                web: howItFitsT('diagram.devices.web'),
              },
              hub: {
                store: howItFitsT('diagram.hub.store'),
                platform: howItFitsT('diagram.hub.platform'),
                plugin: howItFitsT('diagram.hub.plugin'),
              },
            },
          }}
        />

      <Section tone="default" spacing="default" bare>
        <Container width="content">
          <SectionHeading
            eyebrow={pageT('start.eyebrow')}
            title={pageT('start.title')}
            subtitle={pageT('start.subtitle')}
          />
          <GetStartedSteps>
            <GetStartedStep step={1}>
              <h3 className="text-xl font-semibold tracking-tight">
                {pageT('steps.plugin.title')}
              </h3>
              <p className="mt-1 text-muted-foreground">
                {pageT('steps.plugin.body')}
              </p>
              <Card className="mt-4 flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-medium">
                    {pageT('steps.plugin.cardTitle')}
                    <Badge variant="brand-tint" className="ml-2">
                      {pageT('steps.plugin.badge')}
                    </Badge>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {freeVersion
                      ? pageT('steps.plugin.requirementsWithVersion', { version: freeVersion })
                      : pageT('steps.plugin.requirements')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="brand" size="sm">
                    <TrackedExternalLink
                      href="https://wordpress.org/plugins/woocommerce-pos/"
                      target="_blank"
                      rel="noopener noreferrer"
                      eventName="download_clicked"
                      eventProperties={{ plugin: 'free', source: 'wordpress_org', page: '/downloads' }}
                    >
                      {pageT('steps.plugin.wordpressOrgCta')}
                    </TrackedExternalLink>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <TrackedExternalLink
                      href="https://github.com/wcpos/woocommerce-pos/releases"
                      target="_blank"
                      rel="noopener noreferrer"
                      eventName="download_clicked"
                      eventProperties={{ plugin: 'free', source: 'github_zip', page: '/downloads' }}
                    >
                      .zip
                    </TrackedExternalLink>
                  </Button>
                </div>
              </Card>
            </GetStartedStep>

            <GetStartedStep step={2}>
              <h3 className="text-xl font-semibold tracking-tight">
                {pageT('steps.device.title')}
              </h3>
              <p className="mt-1 text-muted-foreground">
                {pageT('steps.device.body')}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <DeviceCard icon={Laptop} title={pageT('steps.device.desktopTitle')} betaLabel={pageT('beta')}>
                  <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-1 sm:gap-y-1">
                    {desktopLinks.map((key, index) => (
                      <span key={PLATFORMS[key].href}>
                        <TextLink href={PLATFORMS[key].href}>{platformT(`${key}.listLabel`)}</TextLink>
                        {index < desktopLinks.length - 1 && <span aria-hidden="true" className="hidden px-1 text-muted-foreground sm:inline">·</span>}
                      </span>
                    ))}
                  </div>
                </DeviceCard>
                <DeviceCard icon={Smartphone} title={platformT('ios.name')} beta betaLabel={pageT('beta')}>
                  <TextLink href={PLATFORMS.ios.href}>{pageT('steps.device.iosCta')}</TextLink>
                </DeviceCard>
                <DeviceCard icon={Smartphone} title={platformT('android.name')} beta betaLabel={pageT('beta')}>
                  <TextLink href={PLATFORMS.android.href}>{pageT('steps.device.androidCta')}</TextLink>
                </DeviceCard>
                <DeviceCard icon={Globe} title={platformT('web.name')} betaLabel={pageT('beta')}>
                  <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-1 sm:gap-y-1">
                    <TextLink href={WEB_SETUP_GUIDE_URL}>{pageT('steps.device.webSetupCta')}</TextLink>
                    <span aria-hidden="true" className="hidden px-1 text-muted-foreground sm:inline">·</span>
                    <TextLink href={PLATFORMS.web.href}>{pageT('steps.device.webCta')}</TextLink>
                  </div>
                </DeviceCard>
              </div>
            </GetStartedStep>

            <GetStartedStep step={3}>
              <h3 className="text-xl font-semibold tracking-tight">
                {pageT('steps.pro.title')}
              </h3>
              <Card className="mt-4 p-5">
                <p className="font-medium">{pageT('steps.pro.cardTitle')}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pageT('steps.pro.cardBody')}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pageT('steps.pro.requirements')}
                </p>
                <Suspense fallback={null}>
                  <ProPriceLine locale={locale} />
                </Suspense>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button asChild variant="brand" size="sm">
                    <TrackedLocaleLink href="/pro" eventName="click_pro_cta">
                      {pageT('steps.pro.plansCta')}
                    </TrackedLocaleLink>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/account/downloads">
                      {pageT('steps.pro.signInCta')}
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </Card>
            </GetStartedStep>
          </GetStartedSteps>
        </Container>
      </Section>

      <Section tone="muted" spacing="default">
        <SectionHeading
          className="mb-10"
          eyebrow={releaseT('eyebrow')}
          title={releaseT('title')}
          subtitle={releaseT('subtitle')}
        />
        {releases.length === 0 && (
          <EmptyState
            icon={<CloudOff />}
            title={releaseT('empty.title')}
            description={releaseT('empty.body')}
          />
        )}
        <ReleaseHistory
          releases={releases}
          locale={locale}
          openFeatureRelease
          clampLongNotes
          copy={{
            latest: releaseT('latest'),
            fullHistory: releaseT('fullHistory'),
            plugin: releaseT('plugin'),
            desktop: releaseT('desktop'),
            externalContentNotice: releaseT('externalContentNotice'),
            // Keep {version} literal; ReleaseHistory fills it per release.
            showAllNotes: releaseT('showAllNotes', { version: '{version}' }),
          }}
        />
      </Section>
      </main>
    </NextIntlClientProvider>
  )
}
