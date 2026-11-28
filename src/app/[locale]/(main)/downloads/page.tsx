import type { Metadata } from 'next'
import { Suspense } from 'react'
import { resolveLocale } from '@/i18n/resolve-locale'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight, CloudOff, Plug } from 'lucide-react'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import { Button } from '@/components/ui/button'
import { Eyebrow } from '@/components/ui/eyebrow'
import { EmptyState } from '@/components/ui/empty-state'
import { TextLink } from '@/components/ui/text-link'
import { Link } from '@/i18n/navigation'
import { TrackedLocaleLink } from '@/components/analytics/tracked-locale-link'
import { TrackedExternalLink } from '@/components/analytics/tracked-external-link'
import { localeUrl, marketingMetadata } from '@/lib/seo'
import { wcposSoftwareApplication } from '@/lib/software-application-json-ld'
import { formatDateForLocale } from '@/lib/date-format'
import { PlatformPicker } from '@/components/downloads/download-hero'
import { PLATFORMS, WEB_SETUP_GUIDE_URL } from '@/components/downloads/platforms'
import { HowItFits } from '@/components/downloads/how-it-fits'
import { ProPriceLine } from '@/components/downloads/pro-price-line'
import {
  GetStartedSteps,
  GetStartedStep,
} from '@/components/downloads/get-started-steps'
import {
  FullHistoryLinks,
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

// Requirement values for the rail table; the plugin line in messages states the same numbers.
const REQUIREMENTS: [string, string][] = [
  ['WordPress', '5.6+ (Pro 5.8+)'],
  ['WooCommerce', '9.0+'],
  ['PHP', '7.4+'],
]
// One class string for the step-1 path chips (Plugins → Add New → …).
const KEY_CHIP =
  'rounded-sm border border-b-2 bg-card px-1.5 font-sans text-[13px] font-medium text-foreground md:text-sm'

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

export default async function DownloadsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = resolveLocale((await params).locale)
  setRequestLocale(locale)

  const [messages, metaT, pageT, heroT, releaseT, howItFitsT, versions] =
    await Promise.all([
      getMessages(),
      getTranslations({ locale, namespace: 'downloads.meta' }),
      getTranslations({ locale, namespace: 'downloads.page' }),
      getTranslations({ locale, namespace: 'downloads.hero' }),
      getTranslations({ locale, namespace: 'downloads.releaseHistory' }),
      getTranslations({ locale, namespace: 'downloads.howItFits' }),
      getProductVersions(),
    ])
  const releases = await getRecentReleases(locale, releaseT)
  const desktopVersion = versionFor(versions, PRODUCT_LABELS.desktop)
  const freeVersion = versionFor(versions, PRODUCT_LABELS.free)
  const facts: [string, string | null][] = [
    [pageT('freePlugin'), freeVersion],
    [pageT('steps.device.desktopTitle'), desktopVersion],
    ...REQUIREMENTS,
    ['macOS', pageT('macosMin')],
    ['Windows', '10 / 11'],
    [pageT('mobileApps'), pageT('beta')],
  ]
  const historyCopy = {
    fullHistory: releaseT('fullHistory'),
    plugin: releaseT('plugin'),
    desktop: releaseT('desktop'),
  }
  const stepTitle = 'text-xl font-semibold tracking-tight'
  const stepBody = 'mt-1.5 text-[15px] text-muted-foreground md:text-base'
  const railTitle = 'mb-2 text-xs font-semibold text-foreground'

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
        <Section
          tone="none"
          spacing="none"
          className="border-b bg-gradient-to-b from-muted/40 to-background pb-12 pt-4 md:pb-20 md:pt-16"
        >
          <div className="mx-auto max-w-6xl">
            <Eyebrow className="max-md:hidden">{heroT('eyebrow')}</Eyebrow>
            <h1 className="text-4xl font-bold leading-tight tracking-tight md:mt-3 md:text-5xl">
              {heroT('title')}
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground md:mt-3 md:text-lg">
              {heroT('tagline')}
            </p>

            <div className="mt-4 grid items-start gap-9 md:mt-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14">
              <GetStartedSteps className="mx-0 mt-0 max-w-none space-y-4 md:space-y-9">
                <GetStartedStep step={1}>
                  <h2 className={stepTitle}>{pageT('steps.plugin.title')}</h2>
                  <p className={stepBody}>
                    {pageT.rich('steps.plugin.body', {
                      k: (chunks) => <kbd className={KEY_CHIP}>{chunks}</kbd>,
                    })}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 md:mt-4">
                    <Button asChild variant="outline">
                      <TrackedExternalLink
                        href="https://wordpress.org/plugins/woocommerce-pos/"
                        target="_blank"
                        rel="noopener noreferrer"
                        eventName="download_clicked"
                        eventProperties={{ plugin: 'free', source: 'wordpress_org', page: '/downloads' }}
                      >
                        <Plug aria-hidden="true" />
                        {pageT('steps.plugin.wordpressOrgCta')}
                      </TrackedExternalLink>
                    </Button>
                    <Button asChild variant="outline">
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
                    {freeVersion && (
                      <span className="ml-2 text-[13px] text-muted-foreground max-md:hidden">
                        {`${pageT('steps.plugin.cardTitle')} ${freeVersion} · ${pageT('steps.plugin.badge')}`}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] text-muted-foreground lg:hidden">
                    {pageT('steps.plugin.requirements')}
                  </p>
                </GetStartedStep>

                <GetStartedStep step={2}>
                  <h2 className={stepTitle}>{pageT('steps.device.title')}</h2>
                  <PlatformPicker desktopVersion={desktopVersion} />
                </GetStartedStep>

                <GetStartedStep step={3}>
                  <h2 className={stepTitle}>{pageT('steps.store.title')}</h2>
                  <p className={stepBody}>{pageT('steps.store.body')}</p>
                  <div className="mt-2 flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-2 md:mt-4">
                    <TextLink href={WEB_SETUP_GUIDE_URL}>{pageT('steps.store.guideCta')}</TextLink>
                    <span aria-hidden="true" className="hidden text-muted-foreground sm:inline">·</span>
                    <TextLink href={PLATFORMS.web.href}>{pageT('steps.store.demoCta')}</TextLink>
                  </div>
                </GetStartedStep>
              </GetStartedSteps>

              <aside className="flex flex-col gap-7 lg:sticky lg:top-22">
                <div>
                  <h2 className={railTitle}>{pageT('versionsTitle')}</h2>
                  <dl className="border-t">
                    {facts.map(([label, value]) =>
                      value ? (
                        <div key={label} className="flex justify-between gap-3 border-b py-2 text-[13px]">
                          <dt className="text-muted-foreground">{label}</dt>
                          <dd className="text-right font-medium">{value}</dd>
                        </div>
                      ) : null,
                    )}
                  </dl>
                </div>
                <div className="text-[13px] text-muted-foreground">
                  <h2 className={railTitle}>{pageT('steps.pro.title')}</h2>
                  <p>{pageT('steps.pro.cardBody')}</p>
                  <Suspense fallback={null}>
                    <ProPriceLine locale={locale} />
                  </Suspense>
                  <div className="mt-2 flex flex-col items-start gap-1 text-sm">
                    <TextLink asChild className="inline-flex items-center gap-1">
                      <TrackedLocaleLink href="/pro" eventName="click_pro_cta">
                        {pageT('steps.pro.plansCta')}
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </TrackedLocaleLink>
                    </TextLink>
                    <TextLink asChild className="inline-flex items-center gap-1">
                      <Link href="/account/downloads">
                        {pageT('steps.pro.signInCta')}
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    </TextLink>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </Section>
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

        <Section tone="default" spacing="default">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <SectionHeading
                align="left"
                eyebrow={releaseT('eyebrow')}
                title={releaseT('title')}
                subtitle={releaseT('subtitle')}
              />
              <FullHistoryLinks copy={historyCopy} className="text-sm text-muted-foreground" />
            </div>
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
              summaries
              copy={{
                ...historyCopy,
                latest: releaseT('latest'),
                externalContentNotice: releaseT('externalContentNotice'),
                // Keep {version} literal; ReleaseHistory fills it per release.
                showAllNotes: releaseT('showAllNotes', { version: '{version}' }),
                actionNeeded: releaseT('actionNeeded'),
              }}
            />
          </div>
        </Section>
      </main>
    </NextIntlClientProvider>
  )
}
