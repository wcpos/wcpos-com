import { Apple, Smartphone, Monitor, Globe } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'

interface Device {
  icon: LucideIcon
  label: string
  description: string
  cta: string
  href: string
  badge: string | null
}

const devices: Device[] = [
  {
    icon: Apple,
    label: 'iOS & iPadOS',
    description: 'Native app with payment terminal and printer support.',
    cta: 'Get the iOS beta',
    href: 'https://testflight.apple.com/join/JGBdVRrW',
    badge: 'Beta',
  },
  {
    icon: Smartphone,
    label: 'Android',
    description: 'Native app with full hardware integration.',
    cta: 'Get the Android beta',
    href: 'https://play.google.com/apps/testing/com.wcpos.main',
    badge: 'Beta',
  },
  {
    icon: Monitor,
    label: 'Windows & macOS',
    description: 'Desktop application for counter setups.',
    cta: 'Download for Desktop',
    href: 'https://github.com/wcpos/electron/releases',
    badge: null,
  },
  {
    icon: Globe,
    label: 'Web Browser',
    description: 'Try instantly — no installation required.',
    cta: 'Try Live Demo',
    href: 'https://demo.wcpos.com/pos',
    badge: 'Beta',
  },
]

export function EcosystemSection() {
  return (
    <Section tone="default" spacing="default">
      <SectionHeading
        className="mb-12"
        title="One ecosystem. Multiple ways to sell."
        subtitle="Install the WordPress plugin, then choose your device."
      />

      {/* Flow Diagram */}
      <div className="mb-12 flex flex-col items-center" aria-hidden="true">
        <div className="mb-4 rounded-xl border border-purple-200 bg-purple-50 px-8 py-4 text-center dark:border-purple-800 dark:bg-purple-900/20">
          <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">
            Your WooCommerce Store
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400">
            WordPress Plugin Installed
          </p>
        </div>

        <div className="mb-4 flex flex-col items-center gap-1">
          <div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            REST API Sync
          </span>
          <div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />
        </div>

        <div className="hidden h-px w-3/4 max-w-2xl bg-slate-300 dark:bg-slate-600 md:block" />
      </div>

      {/* Device Cards */}
      <ul className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {devices.map((device) => (
          <li
            key={device.label}
            className="relative rounded-lg border border-slate-200 bg-white p-5 text-center transition-all hover:-translate-y-1 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
          >
            {device.badge && (
              <Badge variant="beta" className="absolute right-3 top-3">
                {device.badge}
              </Badge>
            )}
            <device.icon
              aria-hidden="true"
              className="mx-auto mb-3 h-8 w-8 text-slate-600 dark:text-slate-300"
            />
            <h3 className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {device.label}
            </h3>
            <p className="mb-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {device.description}
            </p>
            <a
              href={device.href}
              className="rounded text-xs font-medium text-wcpos-red hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wcpos-red focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800"
            >
              {device.cta} <span aria-hidden="true">→</span>
            </a>
          </li>
        ))}
      </ul>

      {/* Explanatory text */}
      <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        All apps sync with your WooCommerce store via the REST API. Install the
        free WordPress plugin, then choose your device. Products, stock, and
        orders stay in sync automatically.
      </p>
    </Section>
  )
}
