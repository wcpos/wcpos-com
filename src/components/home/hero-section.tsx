import { Monitor, Smartphone, Tablet, Wifi } from 'lucide-react'

const primaryCta =
  'inline-flex items-center justify-center rounded-lg bg-wcpos-red px-8 py-3.5 text-base font-semibold text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900'

const secondaryCta =
  'inline-flex items-center justify-center rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900'

const demoProducts = [
  { name: 'Tote Bag', price: '$29' },
  { name: 'Candle', price: '$24' },
  { name: 'Mug', price: '$18' },
  { name: 'Soap Bar', price: '$9' },
  { name: 'Notebook', price: '$14' },
  { name: 'Tea Towel', price: '$16' },
]

const demoCart = [
  { name: 'Candle', qty: 1, total: '$24' },
  { name: 'Mug', qty: 2, total: '$36' },
  { name: 'Soap Bar', qty: 1, total: '$9' },
]

/** Decorative, hand-built POS mockup — no images, no client JS. */
function PosMockup() {
  return (
    <div
      aria-hidden="true"
      className="relative w-full max-w-lg select-none rounded-2xl border border-slate-600/50 bg-slate-700/50 p-3 shadow-2xl"
    >
      <div className="overflow-hidden rounded-xl bg-slate-900">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
          <span className="text-xs font-bold tracking-wide text-white">
            WCPOS
          </span>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-medium text-slate-400">
              Register 1
            </span>
            <Wifi className="h-3.5 w-3.5 text-emerald-400" />
          </div>
        </div>

        <div className="flex">
          {/* Product grid */}
          <div className="grid flex-1 grid-cols-3 gap-2 p-3">
            {demoProducts.map((product, i) => (
              <div
                key={product.name}
                className="overflow-hidden rounded-lg bg-slate-800"
              >
                <div
                  className={`h-10 w-full ${
                    i % 3 === 0
                      ? 'bg-slate-700'
                      : i % 3 === 1
                        ? 'bg-slate-600/70'
                        : 'bg-wcpos-red/30'
                  }`}
                />
                <div className="px-1.5 py-1">
                  <p className="truncate text-[9px] font-medium text-slate-300">
                    {product.name}
                  </p>
                  <p className="text-[9px] text-slate-500">{product.price}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Cart panel */}
          <div className="flex w-32 flex-col border-l border-slate-800 p-3">
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
              Cart
            </p>
            <div className="flex-1 space-y-1.5">
              {demoCart.map((line) => (
                <div
                  key={line.name}
                  className="flex justify-between text-[9px] text-slate-300"
                >
                  <span className="truncate">
                    {line.qty > 1 ? `${line.qty}× ` : ''}
                    {line.name}
                  </span>
                  <span className="text-slate-400">{line.total}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between border-t border-slate-800 pt-2 text-[10px] font-semibold text-white">
              <span>Total</span>
              <span>$69</span>
            </div>
            <div className="mt-2 rounded-md bg-wcpos-red py-1.5 text-center text-[9px] font-bold text-white">
              Charge $69
            </div>
          </div>
        </div>
      </div>

      {/* Floating device icons */}
      <div className="absolute -bottom-4 -right-4 flex gap-3">
        {[Smartphone, Tablet, Monitor].map((Icon, i) => (
          <div
            key={i}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 shadow-lg"
          >
            <Icon className="h-5 w-5 text-slate-300" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-slate-900">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(148,163,184,0.18),transparent)]"
      />
      <div className="container relative mx-auto px-4 py-20 md:py-24 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
          {/* Left - Content */}
          <div className="max-w-xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-widest text-slate-400">
              Point of Sale for WooCommerce
            </p>
            <h1 className="mb-6 text-4xl font-bold leading-tight text-white md:text-5xl">
              Your WooCommerce products, ready to sell in-store
            </h1>
            <p className="mb-8 max-w-md text-lg leading-relaxed text-slate-300">
              Sync everything. Works offline. Native apps for iOS, Android, and
              desktop.
            </p>

            {/* CTA Buttons */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row">
              <a href="https://demo.wcpos.com/pos" className={primaryCta}>
                Try Live Demo
              </a>
              <a
                href="https://wordpress.org/plugins/woocommerce-pos/"
                className={secondaryCta}
              >
                Download Free
              </a>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-slate-400">
              <span>6,000+ Active Stores</span>
              <span aria-hidden="true" className="hidden sm:inline">
                •
              </span>
              <span>Free &amp; Open Source</span>
              <span aria-hidden="true" className="hidden sm:inline">
                •
              </span>
              <span>13 Years Active</span>
            </div>
          </div>

          {/* Right - POS Mockup */}
          <div className="relative hidden items-center justify-center lg:flex">
            <PosMockup />
          </div>
        </div>
      </div>
    </section>
  )
}
