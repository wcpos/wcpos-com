import { Github } from 'lucide-react'

const stats = [
  { value: '6,000+', label: 'Active Installations' },
  { value: '13', label: 'Years in Development' },
  { type: 'icon' as const, label: 'GPL Licensed' },
  { value: '25+', label: 'Languages Supported' },
]

export function TrustSection() {
  return (
    <section className="bg-white dark:bg-slate-950">
      <div className="container mx-auto px-4 py-16 md:py-20">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto mb-12">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              {'type' in stat && stat.type === 'icon' ? (
                <Github className="w-9 h-9 text-wcpos-red mx-auto mb-1" />
              ) : (
                <p className="text-3xl md:text-4xl font-bold text-wcpos-red">
                  {'value' in stat ? stat.value : ''}
                </p>
              )}
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Testimonial */}
        <div className="max-w-2xl mx-auto text-center">
          <blockquote className="text-lg text-slate-700 dark:text-slate-300 italic leading-relaxed mb-4">
            &ldquo;WCPOS solved a problem we thought had no good solution. The
            sync actually works, it&apos;s affordable, and we own our
            setup.&rdquo;
          </blockquote>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            — Wine retailer, France
          </p>
        </div>
      </div>
    </section>
  )
}
