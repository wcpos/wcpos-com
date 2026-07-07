import { Markdown } from '@/components/ui/markdown'
import { Badge } from '@/components/ui/badge'
import { Collapsible } from '@/components/ui/collapsible'
import { TextLink } from '@/components/ui/text-link'

export interface ReleaseEntry {
  version: string
  date: string
  /** Release notes as markdown. */
  body: string
  latest?: boolean
}

export function ReleaseHistory({
  releases,
  copy,
}: {
  releases: ReleaseEntry[]
  copy: {
    latest: string
    fullHistory: string
    plugin: string
    desktop: string
  }
}) {
  return (
    <div className="mx-auto max-w-2xl">
      {releases.map((release, index) => (
        <Collapsible
          key={release.version}
          defaultOpen={index === 0}
          className="border-b"
          summaryClassName="py-4"
          summary={
            <span className="flex items-center gap-3">
              <span className="font-mono text-base font-medium">
                {release.version}
              </span>
              {release.latest && <Badge variant="brand-tint">{copy.latest}</Badge>}
              <span className="text-sm text-muted-foreground">
                {release.date}
              </span>
            </span>
          }
        >
          <div className="pb-5 pl-1">
            <Markdown content={release.body} className="text-sm" />
          </div>
        </Collapsible>
      ))}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {copy.fullHistory}{' '}
        <TextLink href="https://github.com/wcpos/woocommerce-pos/releases">
          {copy.plugin}
        </TextLink>{' '}
        ·{' '}
        <TextLink href="https://github.com/wcpos/electron/releases">
          {copy.desktop}
        </TextLink>
      </p>
    </div>
  )
}
