import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { ThemeToggle } from './theme-toggle'
import { LanguageSelector } from './language-selector'
import { WcposLogo } from '@/components/icons/wcpos-logo'
import { GithubMark } from '@/components/icons/github-mark'
import { DiscordIcon } from '@/components/icons/discord'
import { WordPressIcon } from '@/components/icons/wordpress'
import { PLATFORMS, type PlatformKey } from '@/components/downloads/platforms'

const DISCORD_URL = 'https://discord.gg/MV3E9dSUD'
const GITHUB_URL = 'https://github.com/wcpos'
const WORDPRESS_PLUGIN_URL = 'https://wordpress.org/plugins/woocommerce-pos/'
const WORDPRESS_FORUM_URL =
  'https://wordpress.org/support/plugin/woocommerce-pos/'
const DOCS_URL = 'https://docs.wcpos.com'
const DEMO_URL = 'https://demo.wcpos.com/pos'
const STATUS_URL = 'https://status.wcpos.com/'

/**
 * The desktop + mobile app builds shown in the Download column, derived from
 * the same PLATFORMS source of truth the /downloads page uses so the footer
 * can never drift from the real installer URLs. The macOS Intel build (folded
 * into the macOS tile) and the Web demo (already surfaced as "Live Demo") are
 * omitted — the full matrix lives on /downloads.
 */
const DOWNLOAD_APPS = (
  Object.entries(PLATFORMS) as [PlatformKey, (typeof PLATFORMS)[PlatformKey]][]
)
  .filter(([key]) => key !== 'mac-intel' && key !== 'web')
  .map(([key, platform]) => ({ key, href: platform.href }))

interface FooterLink {
  label: string
  href: string
  external?: boolean
}

export function SiteFooter() {
  const t = useTranslations('footer')
  const platformT = useTranslations('downloads.platforms')

  const productLinks: FooterLink[] = [
    { label: t('downloads'), href: '/downloads' },
    { label: t('pro'), href: '/pro' },
    { label: t('roadmap'), href: '/roadmap' },
    { label: t('demo'), href: DEMO_URL, external: true },
  ]

  const communityLinks: FooterLink[] = [
    { label: t('discord'), href: DISCORD_URL, external: true },
    { label: t('github'), href: GITHUB_URL, external: true },
    { label: t('wordpressOrg'), href: WORDPRESS_PLUGIN_URL, external: true },
  ]

  const supportLinks: FooterLink[] = [
    { label: t('documentation'), href: DOCS_URL },
    { label: t('getSupport'), href: '/support' },
    { label: t('status'), href: STATUS_URL, external: true },
    { label: t('wordpressForum'), href: WORDPRESS_FORUM_URL, external: true },
  ]

  const legalLinks: FooterLink[] = [
    { label: t('privacy'), href: '/privacy' },
    { label: t('terms'), href: '/terms' },
    { label: t('refunds'), href: '/refunds' },
  ]

  const socialLinks = [
    { label: t('socialGithubAria'), href: GITHUB_URL, Icon: GithubMark },
    { label: t('socialDiscordAria'), href: DISCORD_URL, Icon: DiscordIcon },
    {
      label: t('socialWordpressAria'),
      href: WORDPRESS_PLUGIN_URL,
      Icon: WordPressIcon,
    },
  ]

  return (
    <footer className="border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          <FooterColumn heading={t('productHeading')} links={productLinks} />
          <FooterColumn heading={t('communityHeading')} links={communityLinks} />
          <FooterColumn heading={t('supportHeading')} links={supportLinks} />

          <div>
            <FooterHeading>{t('companyHeading')}</FooterHeading>
            <ul className="flex flex-col gap-2.5">
              <FooterItem link={{ label: t('about'), href: '/about-us' }} />
              {legalLinks.map((link) => (
                <FooterItem key={link.href} link={link} />
              ))}
            </ul>
          </div>

          <div>
            <FooterHeading>{t('downloadHeading')}</FooterHeading>
            <ul className="flex flex-col gap-2.5">
              <FooterItem
                link={{
                  label: t('wordpressPlugin'),
                  href: WORDPRESS_PLUGIN_URL,
                  external: true,
                }}
              />
              {DOWNLOAD_APPS.map((app) => (
                <FooterItem
                  key={app.key}
                  link={{
                    label: t('appFor', {
                      platform: platformT(`${app.key}.name`),
                    }),
                    href: app.href,
                    external: true,
                  }}
                />
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <WcposLogo className="h-5 w-5" />
            <p className="text-sm text-muted-foreground">{t('copyright')}</p>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <ThemeToggle />
            <nav className="flex items-center gap-1">
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
      <FooterHeading>{heading}</FooterHeading>
      <ul className="flex flex-col gap-2.5">
        {links.map((link) => (
          <FooterItem key={link.href} link={link} />
        ))}
      </ul>
    </div>
  )
}

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-foreground">
      {children}
    </h3>
  )
}

function FooterItem({ link }: { link: FooterLink }) {
  const className =
    'text-sm text-muted-foreground transition-colors hover:text-foreground'

  if (link.external) {
    return (
      <li>
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
        >
          {link.label}
          <span aria-hidden="true" className="ml-0.5 text-[0.65em] opacity-60">
            ↗
          </span>
        </a>
      </li>
    )
  }

  return (
    <li>
      <Link href={link.href} className={className}>
        {link.label}
      </Link>
    </li>
  )
}
