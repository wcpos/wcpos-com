const milestones = [
  {
    date: 'December 2011',
    title: 'Urban Locavore opens',
    body: 'A small food store in Perth, with hundreds of products already in WooCommerce — and no way to sell them at the counter.',
  },
  {
    date: '2011 – 2014',
    title: 'A register, built out of necessity',
    body: 'With nothing on the market that fit, Paul built a point of sale for his own shop, on top of the store he already ran online.',
  },
  {
    date: 'April 2014',
    title: 'The shop closes',
    body: 'Urban Locavore winds down — but the register it ran on still works, and other WooCommerce stores need the same thing.',
  },
  {
    date: '11 May 2014',
    title: 'Released on WordPress.org',
    body: 'WooCommerce POS goes public, free for anyone who needs it. The free version does the actual job: sell, print, stay in sync.',
  },
  {
    date: 'Today',
    title: 'Still shipping',
    body: 'More than a decade on. One developer, funded by Pro, still releasing — and the free version is still the real thing.',
  },
]

export function StoryTimeline() {
  return (
    <section className="bg-white dark:bg-slate-950">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-12 text-center text-2xl font-semibold text-slate-900 md:text-3xl dark:text-slate-100">
            How it started, and why it&apos;s still here
          </h2>

          <ol className="relative border-l-2 border-slate-200 dark:border-slate-800">
            {milestones.map((m) => (
              <li key={m.date} className="mb-10 ml-6 last:mb-0">
                <span
                  aria-hidden="true"
                  className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-wcpos-red"
                />
                <p className="text-sm font-medium text-wcpos-red">{m.date}</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {m.title}
                </h3>
                <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-400">
                  {m.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
