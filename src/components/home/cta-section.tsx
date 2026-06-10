export function CtaSection() {
  return (
    <section className="bg-slate-800">
      <div className="container mx-auto px-4 py-16 md:py-24 text-center">
        <h2 className="text-2xl md:text-3xl font-semibold text-white mb-4">
          Ready to sell in-store with WooCommerce?
        </h2>
        <p className="text-slate-300 mb-8 max-w-lg mx-auto">
          Try the live demo or download the free plugin to get started.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://demo.wcpos.com/pos"
            className="inline-flex items-center justify-center rounded-lg bg-wcpos-red px-8 py-3.5 text-base font-semibold text-white hover:brightness-110 transition-all"
          >
            Try Live Demo
          </a>
          <a
            href="https://wordpress.org/plugins/woocommerce-pos/"
            className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-slate-800 hover:bg-slate-100 transition-all"
          >
            Download Free
          </a>
        </div>
      </div>
    </section>
  )
}
