import {
  BarChart3,
  PencilLine,
  Receipt,
  Search,
  ShoppingCart,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Feature {
  icon: LucideIcon
  title: string
  description: string
  pro: boolean
}

const features: Feature[] = [
  {
    icon: Search,
    title: 'Fast product search',
    description:
      'Find products instantly with search, filters, and category browsing. Barcode scanner support.',
    pro: false,
  },
  {
    icon: ShoppingCart,
    title: 'Smooth checkout flow',
    description:
      'Add items, apply discounts, choose payment method. Supports Stripe Terminal, SumUp, cash, and custom gateways.',
    pro: true,
  },
  {
    icon: Users,
    title: 'Customer profiles',
    description:
      'Add and edit customer info directly in the POS. Track regulars, offer better service.',
    pro: true,
  },
  {
    icon: Receipt,
    title: 'Order history & management',
    description:
      'View past orders, process returns, check order status without switching to WP Admin.',
    pro: true,
  },
  {
    icon: PencilLine,
    title: 'Edit stock & prices on the fly',
    description:
      'Fix a wrong price while serving a customer. Adjust stock without leaving the POS.',
    pro: true,
  },
  {
    icon: BarChart3,
    title: 'End-of-day reports',
    description:
      'Generate sales reports for each shift or day. Cash up quickly, track performance.',
    pro: true,
  },
]

export function FeaturesSection() {
  return (
    <section className="bg-white dark:bg-slate-950">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <h2 className="mb-12 text-center text-2xl font-semibold text-slate-800 dark:text-slate-100 md:text-3xl">
          Built for the demands of physical retail
        </h2>

        <ul className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <li
              key={feature.title}
              className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/30">
                <feature.icon
                  aria-hidden="true"
                  className="h-5 w-5 text-wcpos-red"
                />
              </div>
              <h3 className="mb-1.5 flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100">
                {feature.title}
                {feature.pro && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                    Pro
                  </span>
                )}
              </h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {feature.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
