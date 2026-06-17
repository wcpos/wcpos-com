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

interface Benefit {
  icon: LucideIcon
  headline: string
  description: string
  supporting: string
  visual: VisualKey
}

const benefits: Benefit[] = [
  {
    icon: RefreshCw,
    headline: 'One catalog, two channels',
    description:
      'Your WooCommerce products are your POS products. Update a price or stock level once — it syncs everywhere automatically. No manual entry, no conflicts, no guesswork.',
    supporting: 'Same products. Same prices. Same customers. Always in sync.',
    visual: 'sync',
  },
  {
    icon: WifiOff,
    headline: 'Works offline',
    description:
      'Local-first architecture means the POS keeps running when your connection drops. Products are stored locally and open orders are preserved — they complete and sync as soon as the internet returns.',
    supporting: 'Never lose an order to internet issues.',
    visual: 'offline',
  },
  {
    icon: Cpu,
    headline: 'Native apps, real hardware',
    description:
      'Native iOS and Android apps — not a browser tab pretending to be an app. Connect payment terminals, receipt printers, and barcode scanners directly.',
    supporting: 'Supports Stripe Terminal, SumUp, and more payment hardware.',
    visual: 'hardware',
  },
  {
    icon: Shield,
    headline: 'You own everything',
    description:
      'Your data stays in your WooCommerce store, on your hosting. No platform lock-in, no third party holding your business hostage. Open source (GPL) — inspect the code, extend it, contribute to it.',
    supporting: "Open source. Self-hosted. You're in control.",
    visual: 'ownership',
  },
]

const visualFrame =
  'flex w-full aspect-video items-center justify-center rounded-md border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900'

function SyncVisual() {
  return (
    <div aria-hidden="true" className={`${visualFrame} select-none gap-4`}>
      {/* WooCommerce admin list */}
      <div className="w-2/5 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
        <p className="mb-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          WooCommerce
        </p>
        {['$24', '$18', '$9'].map((price, i) => (
          <div
            key={i}
            className="mb-1.5 flex items-center justify-between rounded bg-white px-2 py-1.5 dark:bg-slate-900"
          >
            <div className="h-1.5 w-12 rounded bg-slate-300 dark:bg-slate-600" />
            <span
              className={`text-[10px] font-medium ${i === 0 ? 'text-wcpos-red' : 'text-slate-400'}`}
            >
              {price}
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
          {['$24', '$18', '$9', '$14'].map((price, i) => (
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
                {price}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function OfflineVisual() {
  return (
    <div aria-hidden="true" className={visualFrame}>
      <div className="w-full max-w-xs select-none rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            Today&apos;s Sales
          </p>
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
            <WifiOff className="h-2.5 w-2.5" /> Offline
          </span>
        </div>
        {['Sale #1024', 'Sale #1025', 'Sale #1026'].map((sale) => (
          <div
            key={sale}
            className="mb-1.5 flex items-center justify-between rounded bg-white px-2.5 py-1.5 dark:bg-slate-900"
          >
            <span className="text-[10px] text-slate-600 dark:text-slate-300">
              {sale}
            </span>
            <span className="flex items-center gap-1 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-2.5 w-2.5" /> Completed
            </span>
          </div>
        ))}
        <p className="mt-2 text-center text-[9px] text-slate-400 dark:text-slate-500">
          3 sales queued — syncs when you&apos;re back online
        </p>
      </div>
    </div>
  )
}

function HardwareVisual() {
  const items = [
    { icon: Tablet, label: 'iPad / Tablet' },
    { icon: CreditCard, label: 'Card Terminal' },
    { icon: Printer, label: 'Receipt Printer' },
    { icon: ScanBarcode, label: 'Barcode Scanner' },
  ]
  return (
    <div aria-hidden="true" className={`${visualFrame} select-none`}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-4 dark:border-slate-700 dark:bg-slate-800"
          >
            <item.icon className="h-7 w-7 text-slate-600 dark:text-slate-300" />
            <span className="text-center text-[9px] font-medium text-slate-500 dark:text-slate-400">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function OwnershipVisual() {
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
          {['Your hosting', 'Your data', 'GPL licensed'].map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-white px-2.5 py-1 text-[9px] font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300"
            >
              {chip}
            </span>
          ))}
          <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[9px] font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            <GithubIcon className="h-2.5 w-2.5" /> Open source
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
  return (
    <>
      <Section
        aria-labelledby="benefits-heading"
        tone="muted"
        spacing="none"
        className="pt-16 md:pt-20"
      >
        <SectionHeading
          id="benefits-heading"
          title="Why stores choose WCPOS"
        />
      </Section>

      {benefits.map((benefit, index) => {
        const isEven = index % 2 === 0
        const Visual = visuals[benefit.visual]

        return (
          <Section
            key={benefit.headline}
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
                  {benefit.headline}
                </h3>
                <p className="mb-4 leading-relaxed text-slate-600 dark:text-slate-400">
                  {benefit.description}
                </p>
                <p className="text-sm italic text-slate-500 dark:text-slate-400">
                  {benefit.supporting}
                </p>
              </div>
            </div>
          </Section>
        )
      })}
    </>
  )
}
