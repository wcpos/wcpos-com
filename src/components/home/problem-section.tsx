import { useTranslations } from 'next-intl'
import { Copy, WifiOff, Lock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'

type ProblemId = 'doubleEntry' | 'offlinePanic' | 'platformLockIn'

interface Problem {
  icon: LucideIcon
  id: ProblemId
}

const problems: Problem[] = [
  {
    icon: Copy,
    id: 'doubleEntry',
  },
  {
    icon: WifiOff,
    id: 'offlinePanic',
  },
  {
    icon: Lock,
    id: 'platformLockIn',
  },
]

export function ProblemSection() {
  const t = useTranslations('home.problem')

  return (
    <Section tone="muted" spacing="compact">
      <SectionHeading
        className="mx-auto mb-12 max-w-3xl"
        title={t('title')}
      />

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {problems.map((problem) => (
          <div
            key={problem.id}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-6"
          >
            <problem.icon
              aria-hidden="true"
              className="w-10 h-10 text-slate-500 dark:text-slate-400 mb-4"
            />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-2">
              {t(`items.${problem.id}.label`)}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {t(`items.${problem.id}.description`)}
            </p>
          </div>
        ))}
      </div>
    </Section>
  )
}
