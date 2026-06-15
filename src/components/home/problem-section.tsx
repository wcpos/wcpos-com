import { Copy, WifiOff, Lock } from 'lucide-react'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'

const problems = [
  {
    icon: Copy,
    label: 'Double Entry',
    description:
      'Re-entering products in a separate POS wastes hours and creates errors.',
  },
  {
    icon: WifiOff,
    label: 'Offline Panic',
    description:
      'Internet drops and your sales stop. Customers wait. You lose money.',
  },
  {
    icon: Lock,
    label: 'Platform Lock-In',
    description:
      'Proprietary systems trap your data. Moving or customizing becomes impossible.',
  },
]

export function ProblemSection() {
  return (
    <Section tone="muted" spacing="compact">
      <SectionHeading
        className="mx-auto mb-12 max-w-3xl"
        title="Running a WooCommerce store and a physical shop shouldn't mean double the work"
      />

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {problems.map((problem) => (
          <div
            key={problem.label}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6"
          >
            <problem.icon
              aria-hidden="true"
              className="w-10 h-10 text-slate-500 dark:text-slate-400 mb-4"
            />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-2">
              {problem.label}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {problem.description}
            </p>
          </div>
        ))}
      </div>
    </Section>
  )
}
