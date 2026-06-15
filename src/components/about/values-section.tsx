import { Compass, HeartHandshake, Code2, ShieldCheck } from 'lucide-react'

const values = [
  {
    icon: Compass,
    title: 'Independent',
    body: 'No investors, no acquisition exit waiting. The roadmap answers to the shopkeepers using it — not a board.',
  },
  {
    icon: HeartHandshake,
    title: 'Funded by Pro',
    body: 'Pro tools fund every release, free ones included. Shopkeepers pay for it directly, and that keeps the free version free.',
  },
  {
    icon: Code2,
    title: 'Open & GPL',
    body: 'Released on WordPress.org under the GPL. Yours to use, inspect, and keep — wherever WooCommerce runs.',
  },
  {
    icon: ShieldCheck,
    title: 'A fair licence',
    body: 'If a Pro licence lapses, Pro keeps working — you just stop getting updates. Nothing you rely on gets switched off.',
  },
]

export function ValuesSection() {
  return (
    <section className="bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <h2 className="mb-12 text-center text-2xl font-semibold text-slate-900 md:text-3xl dark:text-slate-100">
          What it stands for
        </h2>
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
          {values.map((value) => (
            <div
              key={value.title}
              className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950"
            >
              <value.icon
                aria-hidden="true"
                className="mb-4 h-8 w-8 text-wcpos-red"
              />
              <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {value.title}
              </h3>
              <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                {value.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
