import { Github } from 'lucide-react'

const stats = [
  { value: '6,000+', label: 'Active Installations' },
  { value: '13', label: 'Years in Development' },
]

export function TrustSection() {
  return (
    <section className="bg-white dark:bg-slate-950">
      <div className="container mx-auto px-4 py-16 md:py-20">
        {/* Stats Row */}
        <div className="mx-auto mb-12 grid max-w-3xl grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-wcpos-red md:text-4xl">
                {stat.value}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {stat.label}
              </p>
            </div>
          ))}
          <div className="flex flex-col items-center justify-center text-center">
            <a
              href="https://github.com/wcpos"
              className="group rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wcpos-red focus-visible:ring-offset-2"
            >
              <Github
                aria-hidden="true"
                className="mx-auto mb-1 h-9 w-9 text-wcpos-red"
              />
              <span className="text-sm text-slate-600 group-hover:underline dark:text-slate-400">
                GPL Licensed
              </span>
              <span className="sr-only">— WCPOS on GitHub</span>
            </a>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-wcpos-red md:text-4xl">
              25+
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Languages Supported
            </p>
          </div>
        </div>

        {/* Testimonial */}
        <figure className="mx-auto max-w-2xl text-center">
          <blockquote className="mb-4 text-lg italic leading-relaxed text-slate-700 dark:text-slate-300">
            &ldquo;WCPOS solved a problem we thought had no good solution. The
            sync actually works, it&apos;s affordable, and we own our
            setup.&rdquo;
          </blockquote>
          <figcaption className="text-sm text-slate-500 dark:text-slate-400">
            — Wine retailer, France
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
