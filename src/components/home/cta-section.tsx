export function CtaSection() {
  return (
    <section className="bg-slate-900">
      <div className="container mx-auto px-4 py-16 text-center md:py-24">
        <h2 className="mb-4 text-2xl font-semibold text-white md:text-3xl">
          Ready to sell in-store with WooCommerce?
        </h2>
        <p className="mx-auto mb-8 max-w-lg text-slate-300">
          Try the live demo or download the free plugin to get started.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <a
            href="https://demo.wcpos.com/pos"
            className="inline-flex items-center justify-center rounded-lg bg-wcpos-red px-8 py-3.5 text-base font-semibold text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            Try Live Demo
          </a>
          <a
            href="https://wordpress.org/plugins/woocommerce-pos/"
            className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-slate-900 transition-all hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            Download Free
          </a>
        </div>
      </div>
    </section>
  )
}
