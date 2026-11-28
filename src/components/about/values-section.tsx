import { useTranslations } from 'next-intl'
import {
  ArrowRight,
  Compass,
  HeartHandshake,
  Code2,
  ShieldCheck,
} from 'lucide-react'
import { TextLink } from '@/components/ui/text-link'
import { Link } from '@/i18n/navigation'
import { QuestionSection } from './question-section'

const values = [
  { icon: HeartHandshake, id: 'v2' },
  { icon: ShieldCheck, id: 'v4' },
  { icon: Compass, id: 'v1' },
  { icon: Code2, id: 'v3' },
] as const

export function ValuesSection() {
  const t = useTranslations('about.values')

  return (
    <QuestionSection
      id="paid"
      tone="muted"
      title={t('heading')}
      lead={t('lead')}
    >
      <div>
        <ul className="grid lg:grid-cols-2 lg:gap-x-12">
          {values.map(({ icon: Icon, id }) => (
            <li
              key={id}
              className="border-t py-6 first:border-t-0 first:pt-0 lg:nth-2:border-t-0 lg:nth-2:pt-0"
            >
              <h3 className="flex items-center gap-3 font-semibold text-foreground">
                <Icon className="size-5 shrink-0 text-wcpos-red" aria-hidden="true" />
                {t(`items.${id}.title`)}
              </h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                {t(`items.${id}.body`)}
              </p>
            </li>
          ))}
        </ul>
        <TextLink
          asChild
          className="mt-7 inline-flex items-center gap-1.5 text-sm"
        >
          <Link href="/pro">
            {t('more')}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </TextLink>
      </div>
    </QuestionSection>
  )
}
