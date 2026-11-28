import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { ThemeToggle } from './theme-toggle'
import { LanguageSelector } from './language-selector'
import { ExternalMark, ShellSetting } from './shell-parts'
import { Badge } from '@/components/ui/badge'
import { WcposLogo } from '@/components/icons/wcpos-logo'
import { GithubMark } from '@/components/icons/github-mark'
import { DiscordIcon } from '@/components/icons/discord'
import { WordPressIcon } from '@/components/icons/wordpress'
import { PLATFORMS, type PlatformKey } from '@/components/downloads/platforms'
import { DISCORD_INVITE_URL } from '@/lib/discord-invite'

const GITHUB_URL = 'https://github.com/wcpos'
const WORDPRESS_PLUGIN_URL = 'https://wordpress.org/plugins/woocommerce-pos/'
const WORDPRESS_FORUM_URL =
  'https://wordpress.org/support/plugin/woocommerce-pos/'
const DOCS_URL = 'https://docs.wcpos.com'
const DEMO_URL = 'https://demo.wcpos.com/pos'
const STATUS_URL = 'https://status.wcpos.com/'

/**
 * The desktop + mobile app builds shown in the Apps column, derived from
 * the same PLATFORMS source of truth the /downloads page uses so the footer
 * can never drift from the real installer URLs. The macOS Intel build (folded
 * into the macOS tile) and the Web demo (already surfaced as "Live demo") are
 * omitted — the full matrix lives on /downloads. The store apps are still
 * in beta, so mobile builds carry the Beta marker.
 */
const DOWNLOAD_APPS = (
  Object.entries(PLATFORMS) as [PlatformKey, (typeof PLATFORMS)[PlatformKey]][]
)
  .filter(([key]) => key !== 'mac-intel' && key !== 'web')
  .map(([key, platform]) => ({
    key,
    href: platform.href,
    beta: platform.kind === 'mobile',
  }))

interface FooterLink {
  label: string
  href: string
  external?: boolean
  /** A muted caption or marker after the link. */
  note?: React.ReactNode
}

export function SiteFooter() {
  const t = useTranslations('footer')
  const platformT = useTranslations('downloads.platforms')
  const downloadsT = useTranslations('downloads.page')

  // Grouped by task: what a visitor uses, the apps to install, where to get
  // help, and the project behind it. The legal links sit on the bottom line.
  const useLinks: FooterLink[] = [
    { label: t('downloads'), href: '/downloads' },
    { label: t('pro'), href: '/pro' },
    { label: t('compare'), href: '/compare' },
    { label: t('extensions'), href: '/extensions' },
    { label: t('demo'), href: DEMO_URL, external: true },
  ]

  const appLinks: FooterLink[] = [
    {
      label: t('wordpressPlugin'),
      href: WORDPRESS_PLUGIN_URL,
      external: true,
      // A caption under the link below lg, so the Apps rows stay aligned.
      note: (
        <span className="mt-0.5 block text-xs text-muted-foreground lg:ml-1.5 lg:mt-0 lg:inline">
          {t('installFirst')}
        </span>
      ),
    },
    ...DOWNLOAD_APPS.map((app) => ({
      label: platformT(`${app.key}.name`),
      href: app.href,
      external: true,
      note: app.beta ? (
        <Badge variant="muted-tint" className="ml-1.5 align-[1px]">
          {downloadsT('beta')}
        </Badge>
      ) : undefined,
    })),
  ]

  const helpLinks: FooterLink[] = [
    { label: t('documentation'), href: DOCS_URL, external: true },
    { label: t('getSupport'), href: '/support' },
    { label: t('status'), href: STATUS_URL, external: true },
    { label: t('wordpressForum'), href: WORDPRESS_FORUM_URL, external: true },
    { label: t('discord'), href: DISCORD_INVITE_URL, external: true },
  ]

  const projectLinks: FooterLink[] = [
    { label: t('roadmap'), href: '/roadmap' },
    { label: t('changelog'), href: '/changelog' },
    { label: t('about'), href: '/about-us' },
    { label: t('github'), href: GITHUB_URL, external: true },
    { label: t('wordpressOrg'), href: WORDPRESS_PLUGIN_URL, external: true },
  ]

  const legalLinks: FooterLink[] = [
    { label: t('privacy'), href: '/privacy' },
    { label: t('terms'), href: '/terms' },
    { label: t('refunds'), href: '/refunds' },
  ]

  const socialLinks = [
    { label: t('socialGithubAria'), href: GITHUB_URL, Icon: GithubMark },
    { label: t('socialDiscordAria'), href: DISCORD_INVITE_URL, Icon: DiscordIcon },
    {
      label: t('socialWordpressAria'),
      href: WORDPRESS_PLUGIN_URL,
      Icon: WordPressIcon,
    },
  ]

  return (
    <footer className="border-t">
      <div className="container mx-auto px-4 pb-7 pt-10 lg:pt-14">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4 lg:gap-8">
          <FooterColumn heading={t('useHeading')} links={useLinks} />
          <FooterColumn heading={t('appsHeading')} links={appLinks} />
          <FooterColumn heading={t('helpHeading')} links={helpLinks} />
          <FooterColumn heading={t('projectHeading')} links={projectLinks} />
        </div>

        <div className="mt-9 flex flex-col gap-3.5 border-t pt-6 lg:mt-12 lg:flex-row lg:items-center lg:gap-8">
          <ShellSetting label={t('language')}>
            <LanguageSelector />
          </ShellSetting>
          <ShellSetting label={t('theme')}>
            <ThemeToggle />
          </ShellSetting>
        </div>

        <div className="mt-7 flex flex-col items-start gap-3.5 border-t pt-5 text-[13px] text-muted-foreground lg:mt-6 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:border-t-0 lg:pt-0">
          <div className="flex items-center gap-2">
            <WcposLogo className="h-5 w-5" />
            <p>{t('copyright')}</p>
          </div>
          <div className="flex flex-col items-start gap-2.5 lg:flex-row lg:items-center lg:gap-5">
            <ul className="flex flex-wrap items-center gap-x-[18px] gap-y-2 lg:gap-5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <nav className="-ml-2 flex items-center gap-0.5 lg:ml-0">
              {socialLinks.map(({ label, href, Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({
  heading,
  links,
}: {
  heading: string
  links: FooterLink[]
}) {
  return (
    <div>
      <h3 className="mb-3.5 text-sm font-medium text-muted-foreground">
        {heading}
      </h3>
      <ul className="flex flex-col gap-3">
        {links.map((link) => (
          <FooterItem key={link.href} link={link} />
        ))}
      </ul>
    </div>
  )
}

// The links carry the ink: they are what a visitor reads.
const footerLinkClass =
  'text-sm font-medium text-foreground underline-offset-4 hover:underline'

function FooterItem({ link }: { link: FooterLink }) {
  if (link.external) {
    return (
      <li>
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={footerLinkClass}
        >
          {link.label}
          <ExternalMark />
        </a>
        {link.note}
      </li>
    )
  }

  return (
    <li>
      <Link href={link.href} className={footerLinkClass}>
        {link.label}
      </Link>
      {link.note}
    </li>
  )
}
