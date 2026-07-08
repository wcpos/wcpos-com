import { useTranslations } from 'next-intl'
import { GithubIcon } from '@/components/icons/github'
import { Link } from '@/i18n/navigation'
import { Section } from '@/components/ui/section'

const stats = [
  { value: '5,000+', labelKey: 'activeInstallations' },
  { value: '2014', labelKey: 'inDevelopmentSince' },
] as const

export function TrustSection() {
  const t = useTranslations('home.trust')

  return (
    <Section tone="default" spacing="compact">
      {/* Stats Row */}
      <div className="mx-auto mb-12 grid max-w-3xl grid-cols-2 gap-8 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.labelKey} className="text-center">
            <p className="text-3xl font-bold text-wcpos-red md:text-4xl">
              {stat.value}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t(`stats.${stat.labelKey}`)}
            </p>
          </div>
        ))}
        <div className="flex flex-col items-center justify-center text-center">
          <a
            href="https://github.com/wcpos"
            className="group rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wcpos-red focus-visible:ring-offset-2"
          >
            <GithubIcon
              aria-hidden="true"
              className="mx-auto mb-1 h-9 w-9 text-wcpos-red"
            />
            <span className="text-sm text-slate-600 group-hover:underline dark:text-slate-400">
              {t('license')}
            </span>
            <span className="sr-only">{t('githubAria')}</span>
          </a>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-wcpos-red md:text-4xl">25+</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('stats.languagesSupported')}
          </p>
        </div>
      </div>

      {/* Real customer quote — public wordpress.org review, linked below. */}
      <figure className="mx-auto max-w-2xl text-center">
        <blockquote className="mb-4 text-lg italic leading-relaxed text-slate-700 dark:text-slate-300">
          &ldquo;{t('quote')}&rdquo;
        </blockquote>
        <figcaption className="text-sm text-slate-500 dark:text-slate-400">
          —{' '}
          <a
            href="https://wordpress.org/support/topic/does-what-it-says-836/"
            className="underline underline-offset-4 hover:text-slate-700 dark:hover:text-slate-300"
            rel="noopener"
          >
            {t('attribution')}
          </a>
        </figcaption>
      </figure>

      <p className="mt-8 text-center text-sm">
        <Link
          href="/about-us"
          className="font-medium text-wcpos-red underline-offset-4 hover:underline"
        >
          {t('story')}
        </Link>
      </p>
    </Section>
  )
}
