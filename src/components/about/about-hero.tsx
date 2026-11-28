import { useTranslations } from 'next-intl'
import { ArrowDown } from 'lucide-react'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import { TextLink } from '@/components/ui/text-link'
import { cn } from '@/lib/utils'
import { milestoneDateClassName, useMilestoneDate } from './story-timeline'
import { FounderInitials } from './founder-letter'

/**
 * One answer-row cell: the question as a muted label (the H2 below asks it
 * once), the answer (full on desktop, one short line on phone), a jump link.
 */
function Answer({
  question,
  short,
  link,
  href,
  children,
}: {
  question: string
  short: string
  link: string
  href: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col border-t py-3.5 first:border-t-0 last:pb-0 lg:border-l lg:border-t-0 lg:px-8 lg:pb-0 lg:pt-7 lg:first:border-l-0 lg:first:pl-0 lg:last:pr-0">
      <p className="text-[15px] font-semibold text-muted-foreground">
        {question}
      </p>
      <div className="hidden leading-relaxed lg:block">{children}</div>
      <p className="mt-0.5 lg:hidden">{short}</p>
      <TextLink
        href={href}
        className="mt-auto inline-flex items-center gap-1.5 self-start pt-1.5 text-sm lg:pt-4"
      >
        {link}
        <ArrowDown className="size-3.5" aria-hidden="true" />
      </TextLink>
    </div>
  )
}

export function AboutHero() {
  const t = useTranslations('about')
  const formatDate = useMilestoneDate()
  const milestones = [
    ['m1', t('timeline.items.m1.title')],
    ['m4', t('answers.released')],
    ['m7', t('timeline.items.m7.title')],
  ] as const

  return (
    <Section tone="default" spacing="none" className="pb-10 pt-8 lg:py-18">
      <SectionHeading
        as="h1"
        size="hero"
        align="left"
        eyebrow={t('hero.eyebrow')}
        title={t('hero.title')}
      />
      <p className="mt-3 max-w-3xl text-muted-foreground lg:text-lg">
        {t('hero.subtitle')}
      </p>
      <div className="mt-5 grid border-t lg:mt-12 lg:grid-cols-3">
        <Answer
          question={t('founder.heading')}
          short={t('answers.whoShort')}
          link={t('answers.whoLink')}
          href="#who"
        >
          <p className="mt-3 flex items-center gap-3 text-sm font-semibold">
            <FounderInitials className="size-10" />
            {t('founder.signature.name')}
          </p>
          <p className="mt-2">{t('answers.who')}</p>
        </Answer>
        <Answer
          question={t('timeline.heading')}
          short={t('answers.howLongShort')}
          link={t('answers.howLongLink')}
          href="#how-long"
        >
          <dl className="mt-3 text-sm">
            {milestones.map(([id, label]) => (
              <div key={id} className="flex items-baseline gap-3 py-1.5">
                <dt className={cn('w-34 shrink-0', milestoneDateClassName(id === 'm7'))}>
                  {formatDate(id)}
                </dt>
                <dd>{label}</dd>
              </div>
            ))}
          </dl>
        </Answer>
        <Answer
          question={t('values.heading')}
          short={t('answers.paidShort')}
          link={t('answers.paidLink')}
          href="#paid"
        >
          <p className="mt-2">{t('answers.paid')}</p>
        </Answer>
      </div>
    </Section>
  )
}
