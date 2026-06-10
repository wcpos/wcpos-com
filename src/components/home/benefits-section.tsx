import { RefreshCw, WifiOff, Cpu, Shield } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Benefit {
  icon: LucideIcon
  headline: string
  description: string
  supporting: string
  imageAlt: string
}

const benefits: Benefit[] = [
  {
    icon: RefreshCw,
    headline: 'One catalog, two channels',
    description:
      'Your WooCommerce products are your POS products. Update a price or stock level once — it syncs everywhere automatically. No manual entry, no conflicts, no guesswork.',
    supporting: 'Same products. Same prices. Same customers. Always in sync.',
    imageAlt: 'WooCommerce and WCPOS syncing products',
  },
  {
    icon: WifiOff,
    headline: 'Works offline',
    description:
      'Local-first architecture with RxDB means the POS keeps running when your connection drops. Products are stored locally. Sales complete normally. Everything syncs automatically when the internet returns.',
    supporting: 'Never lose a sale because of internet issues.',
    imageAlt: 'POS working without internet connection',
  },
  {
    icon: Cpu,
    headline: 'Native apps, real hardware',
    description:
      'React Native iOS and Android apps — not a browser tab pretending to be an app. Connect payment terminals (Stripe Terminal, SumUp), receipt printers, and barcode scanners directly.',
    supporting:
      'Supports Stripe Terminal, SumUp, and more payment hardware.',
    imageAlt: 'iPad with card reader and receipt printer',
  },
  {
    icon: Shield,
    headline: 'You own everything',
    description:
      'Your data stays in your WooCommerce store, on your hosting. No platform lock-in, no third party holding your business hostage. Open source (GPL) — inspect the code, extend it, contribute to it.',
    supporting: "Open source. Self-hosted. You're in control.",
    imageAlt: 'Self-hosted WooCommerce setup',
  },
]

function ImagePlaceholder({ alt }: { alt: string }) {
  return (
    <div className="w-full aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700">
      <span className="text-xs text-slate-400 dark:text-slate-500 text-center px-4">
        {alt}
      </span>
    </div>
  )
}

export function BenefitsSection() {
  return (
    <div>
      {benefits.map((benefit, index) => {
        const isEven = index % 2 === 0
        const bgClass = isEven
          ? 'bg-slate-50 dark:bg-slate-900/50'
          : 'bg-white dark:bg-slate-950'

        return (
          <section key={benefit.headline} className={bgClass}>
            <div className="container mx-auto px-4 py-16 md:py-20">
              <div
                className={`grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto ${
                  isEven ? '' : 'md:[direction:rtl] md:[&>*]:[direction:ltr]'
                }`}
              >
                {/* Image */}
                <ImagePlaceholder alt={benefit.imageAlt} />

                {/* Content */}
                <div>
                  <benefit.icon className="w-8 h-8 text-wcpos-red mb-4" />
                  <h3 className="text-xl md:text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
                    {benefit.headline}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                    {benefit.description}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 italic">
                    {benefit.supporting}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}
