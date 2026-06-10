import { Monitor, Smartphone, Tablet } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative bg-slate-800 overflow-hidden">
      <div className="container mx-auto px-4 py-20 md:py-24 lg:py-32">
        <div className="grid lg:grid-cols-[1fr,0.8fr] gap-12 lg:gap-16 items-center">
          {/* Left - Content */}
          <div className="max-w-xl">
            <p className="text-slate-400 text-sm uppercase tracking-widest font-medium mb-4">
              Point of Sale for WooCommerce
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-6">
              Your WooCommerce products, ready to sell in-store
            </h1>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed max-w-md">
              Sync everything. Works offline. Native apps for iOS, Android, and desktop.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <a
                href="https://demo.wcpos.com/pos"
                className="inline-flex items-center justify-center rounded-lg bg-wcpos-red px-8 py-3.5 text-base font-semibold text-white hover:brightness-110 transition-all"
              >
                Try Live Demo
              </a>
              <a
                href="https://wordpress.org/plugins/woocommerce-pos/"
                className="inline-flex items-center justify-center rounded-lg border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-all"
              >
                Download Free
              </a>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400 font-medium">
              <span>6,000+ Active Stores</span>
              <span className="hidden sm:inline">•</span>
              <span>Free &amp; Open Source</span>
              <span className="hidden sm:inline">•</span>
              <span>13 Years Active</span>
            </div>
          </div>

          {/* Right - Device Mockup Placeholder */}
          <div className="relative hidden lg:flex items-center justify-center">
            <div className="relative w-full max-w-md aspect-[4/3] bg-slate-700/50 rounded-2xl border border-slate-600/50 shadow-2xl overflow-hidden">
              {/* Simulated iPad frame */}
              <div className="absolute inset-3 bg-slate-900 rounded-xl overflow-hidden">
                {/* Simulated POS interface */}
                <div className="p-4 h-full flex flex-col">
                  {/* Top bar */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-white text-sm font-semibold">WCPOS</div>
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded bg-slate-700" />
                      <div className="w-6 h-6 rounded bg-slate-700" />
                    </div>
                  </div>
                  {/* Product grid placeholder */}
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div
                        key={i}
                        className="bg-slate-800 rounded-lg flex flex-col items-center justify-center p-2 gap-1"
                      >
                        <div className="w-full aspect-square bg-slate-700/70 rounded" />
                        <div className="w-3/4 h-2 bg-slate-700 rounded" />
                        <div className="w-1/2 h-2 bg-wcpos-red/40 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Floating device icons */}
            <div className="absolute -bottom-4 -right-4 flex gap-3">
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center shadow-lg">
                <Smartphone className="w-5 h-5 text-slate-300" />
              </div>
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center shadow-lg">
                <Tablet className="w-5 h-5 text-slate-300" />
              </div>
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center shadow-lg">
                <Monitor className="w-5 h-5 text-slate-300" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
