import { GithubIcon } from '@/components/icons/github'
import { Link } from '@/i18n/navigation'

const stats = [
  { value: '5,000+', label: 'Active Installations' },
  { value: '2014', label: 'In Development Since' },
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
              <GithubIcon
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

        {/* Real customer quote — public wordpress.org review, linked below. */}
        <figure className="mx-auto max-w-2xl text-center">
          <blockquote className="mb-4 text-lg italic leading-relaxed text-slate-700 dark:text-slate-300">
            &ldquo;Straightforward, functional and simple to use. 10/10.&rdquo;
          </blockquote>
          <figcaption className="text-sm text-slate-500 dark:text-slate-400">
            —{' '}
            <a
              href="https://wordpress.org/support/topic/does-what-it-says-836/"
              className="underline underline-offset-4 hover:text-slate-700 dark:hover:text-slate-300"
              rel="noopener"
            >
              Ward, wordpress.org review
            </a>
          </figcaption>
        </figure>

        <p className="mt-8 text-center text-sm">
          <Link
            href="/about-us"
            className="font-medium text-wcpos-red underline-offset-4 hover:underline"
          >
            Read our story →
          </Link>
        </p>
      </div>
    </section>
  )
}
