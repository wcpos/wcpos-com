import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Section } from '@/components/ui/section'
import { TextLink } from '@/components/ui/text-link'
import { COMPARISONS } from '@/lib/compare-pages'

// Links each /compare/* page to the others under their hub card titles.
// `current` is the page's own href; an unknown href lists every comparison.
export async function MoreComparisons({ current }: { current: string }) {
  const t = await getTranslations('compare')
  const others = COMPARISONS.filter(({ href }) => href !== current)

  return (
    <Section tone="default" spacing="compact" containerClassName="max-w-3xl">
      <h2 className="mb-6 text-2xl font-semibold">{t('more.title')}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {others.map(({ key, href }) => (
          <li key={key}>
            <TextLink asChild>
              <Link href={href}>{t(`hub.${key}.title`)}</Link>
            </TextLink>
          </li>
        ))}
      </ul>
    </Section>
  )
}
