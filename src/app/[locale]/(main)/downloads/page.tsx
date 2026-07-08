import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Laptop, Smartphone, Globe, ArrowRight } from 'lucide-react'
import { Section, Container } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TextLink } from '@/components/ui/text-link'
import { Link } from '@/i18n/navigation'
import { TrackedLocaleLink } from '@/components/analytics/tracked-locale-link'
import { TrackedExternalLink } from '@/components/analytics/tracked-external-link'
import { marketingMetadata } from '@/lib/seo'
import { formatDateForLocale } from '@/lib/date-format'
import { DownloadsHero } from '@/components/downloads/download-hero'
import { PLATFORMS, type PlatformKey } from '@/components/downloads/platforms'
import { HowItFits } from '@/components/downloads/how-it-fits'
import {
  GetStartedSteps,
  GetStartedStep,
} from '@/components/downloads/get-started-steps'
import {
  ReleaseHistory,
  type ReleaseEntry,
} from '@/components/downloads/release-history'
import { getReleases } from '@/services/core/external/github-client'
import {
  getProductVersions,
  versionFor,
  PRODUCT_LABELS,
} from '@/services/core/external/versions-client'
import enMessages from '../../../../../messages/en.json'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'downloads.meta' })
  return marketingMetadata({
    locale,
    path: '/downloads',
    title: t('title'),
    description: t('description'),
  })
}

type FallbackBodyKey = 'v196' | 'v195' | 'v194' | 'v190'

type FallbackRelease = Omit<ReleaseEntry, 'date' | 'body'> & {
  publishedAt: string
  bodyKey: FallbackBodyKey
}

const FALLBACK_RELEASES: FallbackRelease[] = [
  { version: '1.9.6', publishedAt: '2026-06-17T00:00:00.000Z', latest: true, bodyKey: 'v196' },
  { version: '1.9.5', publishedAt: '2026-06-15T00:00:00.000Z', bodyKey: 'v195' },
  { version: '1.9.4', publishedAt: '2026-06-13T00:00:00.000Z', bodyKey: 'v194' },
  { version: '1.9.0', publishedAt: '2026-05-15T00:00:00.000Z', bodyKey: 'v190' },
]

const ENGLISH_FALLBACK_RELEASE_BODIES: Record<FallbackBodyKey, string> =
  enMessages.downloads.releaseHistory.fallback

function formatReleaseDate(iso: string, locale: string): string {
  return formatDateForLocale(iso, locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getFallbackReleases(locale: string): ReleaseEntry[] {
  return FALLBACK_RELEASES.map(({ publishedAt, bodyKey, ...release }) => ({
    ...release,
    date: formatReleaseDate(publishedAt, locale),
    body: ENGLISH_FALLBACK_RELEASE_BODIES[bodyKey],
    contentLocale: 'en',
  }))
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

  if (published.length === 0) {
    return getFallbackReleases(locale)
  }

  return published.map((release, index) => {
    const body = release.body.trim()
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
  const { locale } = await params
  setRequestLocale(locale)

  const [pageT, platformT, releaseT, howItFitsT, versions] = await Promise.all([
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
    <main>
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
                      eventName="download_clicked"
                      eventProperties={{ plugin: 'free', source: 'wordpress_org', page: '/downloads' }}
                    >
                      {pageT('steps.plugin.wordpressOrgCta')}
                    </TrackedExternalLink>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <TrackedExternalLink
                      href="https://github.com/wcpos/woocommerce-pos/releases"
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
                  <div className="flex flex-wrap gap-x-1 gap-y-1">
                    {desktopLinks.map((key, index) => (
                      <span key={PLATFORMS[key].href}>
                        <TextLink href={PLATFORMS[key].href}>{platformT(`${key}.listLabel`)}</TextLink>
                        {index < desktopLinks.length - 1 && <span className="px-1 text-muted-foreground">·</span>}
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
                  <TextLink href={PLATFORMS.web.href}>{pageT('steps.device.webCta')}</TextLink>
                </DeviceCard>
              </div>
            </GetStartedStep>

            <GetStartedStep step={3}>
              <h3 className="text-xl font-semibold tracking-tight">
                {pageT('steps.pro.title')}
              </h3>
              <p className="mt-1 text-muted-foreground">
                {pageT('steps.pro.body')}
              </p>
              <Card className="mt-4 p-5">
                <p className="font-medium">{pageT('steps.pro.cardTitle')}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pageT('steps.pro.cardBody')}
                </p>
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
        <ReleaseHistory
          releases={releases}
          copy={{
            latest: releaseT('latest'),
            fullHistory: releaseT('fullHistory'),
            plugin: releaseT('plugin'),
            desktop: releaseT('desktop'),
            externalContentNotice: releaseT('externalContentNotice'),
          }}
        />
      </Section>
    </main>
  )
}
