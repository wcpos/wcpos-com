import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { Laptop, Smartphone, Globe, ArrowRight } from 'lucide-react'
import { Section, Container } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import { TrackedLocaleLink } from '@/components/analytics/tracked-locale-link'
import { marketingMetadata } from '@/lib/seo'
import { DownloadsHero } from '@/components/downloads/download-hero'
import { DownloadPicker } from '@/components/downloads/download-picker'
import { PLATFORMS } from '@/components/downloads/platforms'
import { HowItFits } from '@/components/downloads/how-it-fits'
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return marketingMetadata({
    locale,
    path: '/downloads',
    title: 'Downloads',
    description:
      'Download WCPOS — the free plugin plus the desktop, iOS, Android and web apps. See the latest version and recent release notes.',
  })
}

const DESKTOP_LINKS = [
  { label: 'macOS (Apple Silicon)', href: PLATFORMS['mac-arm'].href },
  { label: 'macOS (Intel)', href: PLATFORMS['mac-intel'].href },
  { label: 'Windows', href: PLATFORMS.win.href },
  { label: 'Linux', href: PLATFORMS.linux.href },
]

/**
 * Shown only if the GitHub releases feed is unavailable at build/render time,
 * so the changelog is never empty. Mirrors the latest readme.txt highlights.
 */
type FallbackRelease = Omit<ReleaseEntry, 'date'> & { publishedAt: string }

const FALLBACK_RELEASES: FallbackRelease[] = [
  {
    version: '1.9.6',
    publishedAt: '2026-06-17T00:00:00.000Z',
    latest: true,
    body: '- Cash drawer support — auto-open after payment or via a new Open Drawer button, with per-printer connectors (ESC-POS, Epson, PrintNode, cloud)\n- Fixed analytics events firing too often\n- Updated translations',
  },
  {
    version: '1.9.5',
    publishedAt: '2026-06-15T00:00:00.000Z',
    body: '- Fixed a payment-gateways API crash (HTTP 500 with some third-party gateways, e.g. ToyyibPay)',
  },
  {
    version: '1.9.4',
    publishedAt: '2026-06-13T00:00:00.000Z',
    body: '- Redesigned Bluetooth printer setup; serial printing for OS-paired Bluetooth Classic printers\n- Improved Windows raw printing; smoother USB flow',
  },
  {
    version: '1.9.0',
    publishedAt: '2026-05-15T00:00:00.000Z',
    body: '- New receipt template gallery; thermal printing (58/80mm)\n- Customer Tax IDs; Pro coupons & refunds at the POS',
  },
]

function formatReleaseDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

function getFallbackReleases(locale: string): ReleaseEntry[] {
  return FALLBACK_RELEASES.map(({ publishedAt, ...release }) => ({
    ...release,
    date: formatReleaseDate(publishedAt, locale),
  }))
}

async function getRecentReleases(locale: string): Promise<ReleaseEntry[]> {
  const releases = await getReleases('woocommerce-pos')
  const published = releases
    .filter((release) => !release.draft && !release.prerelease)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 6)

  if (published.length === 0) {
    return getFallbackReleases(locale)
  }

  return published.map((release, index) => ({
    version: release.tagName.replace(/^v/, ''),
    date: formatReleaseDate(release.publishedAt, locale),
    body: release.body.trim() || '_No release notes for this version._',
    latest: index === 0,
  }))
}

function StepNumber({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute -left-12 top-0 flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-wcpos-red bg-background text-sm font-semibold text-wcpos-red-accent">
      {children}
    </span>
  )
}

function DeviceCard({
  icon: Icon,
  title,
  beta,
  children,
}: {
  icon: typeof Laptop
  title: string
  beta?: boolean
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
            <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Beta
            </span>
          )}
        </p>
        <div className="mt-1 text-sm text-muted-foreground">{children}</div>
      </div>
    </Card>
  )
}

export default async function DownloadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  let showPrototypeHero = false

  if (process.env.NODE_ENV !== 'production') {
    const resolvedSearchParams = searchParams ? await searchParams : {}
    const variantParam = resolvedSearchParams.variant
    const variant = Array.isArray(variantParam) ? variantParam[0] : variantParam
    showPrototypeHero = variant === 'hero'
  }

  setRequestLocale(locale)

  const [versions, releases] = await Promise.all([
    getProductVersions(),
    getRecentReleases(locale),
  ])
  const desktopVersion = versionFor(versions, PRODUCT_LABELS.desktop)
  const freeVersion = versionFor(versions, PRODUCT_LABELS.free)

  return (
    <main>
      {/* HERO */}
      {showPrototypeHero ? (
        <DownloadsHero desktopVersion={desktopVersion} />
      ) : (
        <Section
          tone="none"
          spacing="hero"
          className="border-b bg-gradient-to-b from-muted/40 to-background"
        >
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-wcpos-red dark:text-wcpos-red-accent">
                Downloads
              </p>
              <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
                Take orders on any device.
              </h1>
              <p className="mt-5 max-w-md text-lg text-muted-foreground">
                WCPOS is the fast point of sale for WooCommerce — free,
                offline-first, and in sync across desktop, tablet and phone.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="brand" size="xl">
                  <a href="https://wordpress.org/plugins/woocommerce-pos/">
                    Install the free plugin
                  </a>
                </Button>
                <Button asChild variant="outline" size="xl">
                  <a href="https://demo.wcpos.com/pos">Try the live demo</a>
                </Button>
              </div>
            </div>
            <DownloadPicker desktopVersion={desktopVersion} />
          </div>
        </Section>
      )}

      {/* HOW IT FITS TOGETHER */}
      <HowItFits />

      {/* GET STARTED */}
      <Section tone="default" spacing="default" bare>
        <Container width="content">
          <SectionHeading
            eyebrow="Get started"
            title="Three steps to your first sale"
            subtitle="It takes about two minutes, start to finish."
          />
          <ol className="relative mx-auto mt-12 max-w-2xl space-y-10 pl-12 before:absolute before:bottom-12 before:left-[15px] before:top-2 before:w-px before:bg-border">
            <li className="relative">
              <StepNumber>1</StepNumber>
              <h3 className="text-xl font-semibold tracking-tight">
                Install the free plugin
              </h3>
              <p className="mt-1 text-muted-foreground">
                The foundation everything connects to. In your dashboard:
                Plugins → Add New, then search “WCPOS”.
              </p>
              <Card className="mt-4 flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-medium">
                    WCPOS
                    <span className="ml-2 rounded bg-wcpos-red/10 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-wcpos-red-accent">
                      Free · GPL
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {freeVersion ? `Latest ${freeVersion} · ` : ''}WordPress
                    5.6+ · WooCommerce 5.3+ · PHP 7.4+
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="brand" size="sm">
                    <a href="https://wordpress.org/plugins/woocommerce-pos/">
                      WordPress.org
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href="https://github.com/wcpos/woocommerce-pos/releases">
                      .zip
                    </a>
                  </Button>
                </div>
              </Card>
            </li>

            <li className="relative">
              <StepNumber>2</StepNumber>
              <h3 className="text-xl font-semibold tracking-tight">
                Pick your device
              </h3>
              <p className="mt-1 text-muted-foreground">
                All free, all in sync. Grab the one we detected up top, or any
                of these.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <DeviceCard icon={Laptop} title="Desktop app">
                  <div className="flex flex-wrap gap-x-1 gap-y-1">
                    {DESKTOP_LINKS.map((link, index) => (
                      <span key={link.href}>
                        <a
                          href={link.href}
                          className="font-medium text-wcpos-red-accent hover:underline"
                        >
                          {link.label}
                        </a>
                        {index < DESKTOP_LINKS.length - 1 && (
                          <span className="px-1 text-muted-foreground">·</span>
                        )}
                      </span>
                    ))}
                  </div>
                </DeviceCard>
                <DeviceCard icon={Smartphone} title="iOS & iPad" beta>
                  <a
                    href={PLATFORMS.ios.href}
                    className="font-medium text-wcpos-red-accent hover:underline"
                  >
                    Join the TestFlight beta
                  </a>
                </DeviceCard>
                <DeviceCard icon={Smartphone} title="Android" beta>
                  <a
                    href={PLATFORMS.android.href}
                    className="font-medium text-wcpos-red-accent hover:underline"
                  >
                    Join on Google Play
                  </a>
                </DeviceCard>
                <DeviceCard icon={Globe} title="Web">
                  <a
                    href={PLATFORMS.web.href}
                    className="font-medium text-wcpos-red-accent hover:underline"
                  >
                    Open the live demo
                  </a>
                </DeviceCard>
              </div>
            </li>

            <li className="relative">
              <StepNumber>3</StepNumber>
              <h3 className="text-xl font-semibold tracking-tight">
                Want more? Go Pro
              </h3>
              <p className="mt-1 text-muted-foreground">
                A licensed plugin that adds terminal payments, refunds and stock
                control on the same foundation.
              </p>
              <Card className="mt-4 p-5">
                <p className="font-medium">Unlock the full till</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Payments, refunds, stock &amp; pricing, order management,
                  end-of-day reports, multi-store and priority Discord support.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button asChild variant="brand" size="sm">
                    <TrackedLocaleLink href="/pro" eventName="click_pro_cta">
                      View Pro plans
                    </TrackedLocaleLink>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/account/downloads">
                      Sign in to download
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </Card>
            </li>
          </ol>
        </Container>
      </Section>

      {/* RELEASE HISTORY */}
      <Section tone="muted" spacing="default">
        <SectionHeading
          className="mb-10"
          eyebrow="Release history"
          title="What's new"
          subtitle="Recent changes — every app shares one version line."
        />
        <ReleaseHistory releases={releases} />
      </Section>
    </main>
  )
}
