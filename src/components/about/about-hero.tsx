export function AboutHero() {
  return (
    <section className="relative overflow-hidden bg-slate-900">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(148,163,184,0.18),transparent)]"
      />
      <div className="container relative mx-auto px-4 py-20 text-center md:py-24">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-slate-400">
          Our story
        </p>
        <h1 className="mx-auto mb-6 max-w-3xl text-4xl font-bold leading-tight text-white md:text-5xl">
          An independent point of sale for WooCommerce
        </h1>
        <p className="mx-auto max-w-xl text-lg leading-relaxed text-slate-300">
          Built by a former shopkeeper, funded by shopkeepers — not investors.
          One developer, more than a decade of releases, still shipping.
        </p>
      </div>
    </section>
  )
}
