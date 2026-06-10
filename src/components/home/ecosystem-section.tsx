import { Apple, Smartphone, Monitor, Globe } from 'lucide-react'

const devices = [
  {
    icon: Apple,
    label: 'iOS & iPadOS',
    description: 'Native app with payment terminal and printer support.',
    cta: 'Download for iOS',
    badge: 'Beta',
  },
  {
    icon: Smartphone,
    label: 'Android',
    description: 'Native app with full hardware integration.',
    cta: 'Download for Android',
    badge: 'Beta',
  },
  {
    icon: Monitor,
    label: 'Windows & macOS',
    description: 'Desktop application for counter setups.',
    cta: 'Download for Desktop',
    badge: null,
  },
  {
    icon: Globe,
    label: 'Web Browser',
    description: 'Try instantly — no installation required.',
    cta: 'Try Live Demo',
    badge: 'Beta',
  },
]

export function EcosystemSection() {
  return (
    <section className="bg-white dark:bg-slate-950">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-800 dark:text-slate-100 mb-3">
            One ecosystem. Multiple ways to sell.
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Install the WordPress plugin, then choose your device.
          </p>
        </div>

        {/* Flow Diagram */}
        <div className="flex flex-col items-center mb-12">
          {/* WooCommerce Store */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl px-8 py-4 text-center mb-4">
            <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">
              Your WooCommerce Store
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              WordPress Plugin Installed
            </p>
          </div>

          {/* Connector */}
          <div className="flex flex-col items-center gap-1 mb-4">
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-600" />
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
              REST API Sync
            </span>
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-600" />
          </div>

          {/* Branch lines */}
          <div className="hidden md:block w-3/4 max-w-2xl h-px bg-slate-300 dark:bg-slate-600 mb-4" />
        </div>

        {/* Device Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {devices.map((device) => (
            <div
              key={device.label}
              className="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5 text-center hover:shadow-md hover:-translate-y-1 transition-all"
            >
              {device.badge && (
                <span className="absolute top-3 right-3 text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 px-2 py-0.5 rounded-full">
                  {device.badge}
                </span>
              )}
              <device.icon className="w-8 h-8 text-slate-600 dark:text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
                {device.label}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                {device.description}
              </p>
              <span className="text-xs font-medium text-wcpos-red cursor-pointer hover:underline">
                {device.cta} →
              </span>
            </div>
          ))}
        </div>

        {/* Explanatory text */}
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-2xl mx-auto mt-10 leading-relaxed">
          All apps sync with your WooCommerce store via the REST API. Install
          the free WordPress plugin, then choose your device. Products, stock,
          and orders stay in sync automatically.
        </p>
      </div>
    </section>
  )
}
