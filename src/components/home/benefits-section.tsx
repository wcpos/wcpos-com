import { useLocale, useTranslations } from 'next-intl'
import {
  ArrowLeftRight,
  CreditCard,
  Printer,
  RefreshCw,
  ScanBarcode,
  Server,
  Shield,
  ShieldCheck,
  Tablet,
  WifiOff,
  Cpu,
  Check,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { GithubIcon } from '@/components/icons/github'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'

type VisualKey = 'sync' | 'offline' | 'hardware' | 'ownership'
type BenefitId = VisualKey

interface Benefit {
  icon: LucideIcon
  id: BenefitId
  visual: VisualKey
}

const benefits: Benefit[] = [
  {
    icon: RefreshCw,
    id: 'sync',
    visual: 'sync',
  },
  {
    icon: WifiOff,
    id: 'offline',
    visual: 'offline',
  },
  {
    icon: Cpu,
    id: 'hardware',
    visual: 'hardware',
  },
  {
    icon: Shield,
    id: 'ownership',
    visual: 'ownership',
  },
]

const visualFrame =
  'flex w-full aspect-video items-center justify-center rounded-md border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900'

function formatBenefitDemoAmount(locale: string, amount: number): string {
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }

  try {
    return new Intl.NumberFormat(locale, options).format(amount)
  } catch {
    return new Intl.NumberFormat('en', options).format(amount)
  }
}

function SyncVisual() {
  const locale = useLocale()
  const formatAmount = (amount: number) => formatBenefitDemoAmount(locale, amount)

  return (
    <div aria-hidden="true" className={`${visualFrame} select-none gap-4`}>
      {/* WooCommerce admin list */}
      <div className="w-2/5 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
        <p className="mb-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          WooCommerce
        </p>
        {[24, 18, 9].map((price, i) => (
          <div
            key={i}
            className="mb-1.5 flex items-center justify-between rounded bg-white px-2 py-1.5 dark:bg-slate-900"
          >
            <div className="h-1.5 w-12 rounded bg-slate-300 dark:bg-slate-600" />
            <span
              className={`text-[10px] font-medium ${i === 0 ? 'text-wcpos-red' : 'text-slate-400'}`}
            >
              {formatAmount(price)}
            </span>
          </div>
        ))}
      </div>

      <ArrowLeftRight className="h-6 w-6 shrink-0 text-wcpos-red" />

      {/* POS grid */}
      <div className="w-2/5 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
        <p className="mb-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          POS
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {[24, 18, 9, 14].map((price, i) => (
            <div
              key={i}
              className={`rounded bg-white p-1.5 text-center dark:bg-slate-900 ${
                i === 0 ? 'ring-1 ring-wcpos-red' : ''
              }`}
            >
              <div className="mb-1 h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
              <span
                className={`text-[9px] font-medium ${i === 0 ? 'text-wcpos-red' : 'text-slate-400'}`}
              >
                {formatAmount(price)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function OfflineVisual() {
  const t = useTranslations('home.benefits.visuals.offline')

  return (
    <div aria-hidden="true" className={visualFrame}>
      <div className="w-full max-w-xs select-none rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            {t('title')}
          </p>
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
            <WifiOff className="h-2.5 w-2.5" /> {t('badge')}
          </span>
        </div>
        {['1024', '1025', '1026'].map((sale) => (
          <div
            key={sale}
            className="mb-1.5 flex items-center justify-between rounded bg-white px-2.5 py-1.5 dark:bg-slate-900"
          >
            <span className="text-[10px] text-slate-600 dark:text-slate-300">
              {t('sale', { number: sale })}
            </span>
            <span className="flex items-center gap-1 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-2.5 w-2.5" /> {t('completed')}
            </span>
          </div>
        ))}
        <p className="mt-2 text-center text-[9px] text-slate-400 dark:text-slate-500">
          {t('queued')}
        </p>
      </div>
    </div>
  )
}

function HardwareVisual() {
  const t = useTranslations('home.benefits.visuals.hardware')
  const items = [
    { icon: Tablet, id: 'tablet' },
    { icon: CreditCard, id: 'terminal' },
    { icon: Printer, id: 'printer' },
    { icon: ScanBarcode, id: 'scanner' },
  ] as const
  return (
    <div aria-hidden="true" className={`${visualFrame} select-none`}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-4 dark:border-slate-700 dark:bg-slate-800"
          >
            <item.icon className="h-7 w-7 text-slate-600 dark:text-slate-300" />
            <span className="text-center text-[9px] font-medium text-slate-500 dark:text-slate-400">
              {t(item.id)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function OwnershipVisual() {
  const t = useTranslations('home.benefits.visuals.ownership')

  return (
    <div aria-hidden="true" className={visualFrame}>
      <div className="w-full max-w-xs select-none rounded-md border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-3 flex items-center justify-center gap-2">
          <Server className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          <span className="font-mono text-xs text-slate-700 dark:text-slate-200">
            yourstore.com
          </span>
          <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {(['hosting', 'data', 'license'] as const).map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-white px-2.5 py-1 text-[9px] font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300"
            >
              {t(`chips.${chip}`)}
            </span>
          ))}
          <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[9px] font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            <GithubIcon className="h-2.5 w-2.5" /> {t('chips.openSource')}
          </span>
        </div>
      </div>
    </div>
  )
}

const visuals: Record<VisualKey, () => React.JSX.Element> = {
  sync: SyncVisual,
  offline: OfflineVisual,
  hardware: HardwareVisual,
  ownership: OwnershipVisual,
}

export function BenefitsSection() {
  const t = useTranslations('home.benefits')

  return (
    <section aria-labelledby="benefits-heading">
      <Section
        tone="muted"
        spacing="none"
        className="pt-16 md:pt-20"
      >
        <SectionHeading
          id="benefits-heading"
          title={t('heading')}
        />
      </Section>

      {benefits.map((benefit, index) => {
        const isEven = index % 2 === 0
        const Visual = visuals[benefit.visual]

        return (
          <Section
            key={benefit.id}
            tone={isEven ? 'muted' : 'default'}
            spacing="compact"
          >
            <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
              <div className={isEven ? '' : 'md:order-last'}>
                <Visual />
              </div>

              <div>
                <benefit.icon
                  aria-hidden="true"
                  className="mb-4 h-8 w-8 text-wcpos-red"
                />
                <h3 className="mb-3 text-xl font-semibold text-slate-800 dark:text-slate-100 md:text-2xl">
                  {t(`items.${benefit.id}.headline`)}
                </h3>
                <p className="mb-4 leading-relaxed text-slate-600 dark:text-slate-400">
                  {t(`items.${benefit.id}.description`)}
                </p>
                <p className="text-sm italic text-slate-500 dark:text-slate-400">
                  {t(`items.${benefit.id}.supporting`)}
                </p>
              </div>
            </div>
          </Section>
        )
      })}
    </section>
  )
}
