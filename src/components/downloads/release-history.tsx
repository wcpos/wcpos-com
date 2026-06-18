import { ChevronDown } from 'lucide-react'
import { Markdown } from '@/components/ui/markdown'

export interface ReleaseEntry {
  version: string
  date: string
  /** Release notes as markdown. */
  body: string
  latest?: boolean
}

/**
 * Collapsible changelog. Uses native <details> so it works without client
 * JavaScript; the first (latest) entry is open by default.
 */
export function ReleaseHistory({ releases }: { releases: ReleaseEntry[] }) {
  return (
    <div className="mx-auto max-w-2xl">
      {releases.map((release, index) => (
        <details
          key={release.version}
          open={index === 0}
          className="group border-b"
        >
          <summary className="flex cursor-pointer list-none items-center gap-3 py-4 [&::-webkit-details-marker]:hidden">
            <span className="font-mono text-base font-medium">
              {release.version}
            </span>
            {release.latest && (
              <span className="rounded-md bg-wcpos-red/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-wcpos-red-accent">
                Latest
              </span>
            )}
            <span className="text-sm text-muted-foreground">{release.date}</span>
            <ChevronDown
              className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="pb-5 pl-1">
            <Markdown content={release.body} className="text-sm" />
          </div>
        </details>
      ))}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Full history on GitHub —{' '}
        <a
          href="https://github.com/wcpos/woocommerce-pos/releases"
          className="font-medium text-wcpos-red-accent hover:underline"
        >
          Free
        </a>{' '}
        ·{' '}
        <a
          href="https://github.com/wcpos/electron/releases"
          className="font-medium text-wcpos-red-accent hover:underline"
        >
          Desktop
        </a>
      </p>
    </div>
  )
}
