import { Copy, WifiOff, Lock } from 'lucide-react'

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
    <section className="bg-slate-50 dark:bg-slate-900/50">
      <div className="container mx-auto px-4 py-16 md:py-20">
        <h2 className="text-2xl md:text-3xl font-semibold text-center max-w-3xl mx-auto mb-12 text-slate-800 dark:text-slate-100">
          Running a WooCommerce store and a physical shop shouldn&apos;t mean
          double the work
        </h2>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {problems.map((problem) => (
            <div
              key={problem.label}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6"
            >
              <problem.icon className="w-10 h-10 text-slate-500 dark:text-slate-400 mb-4" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-2">
                {problem.label}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
