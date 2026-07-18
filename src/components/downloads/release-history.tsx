import { Markdown } from '@/components/ui/markdown'
import { Badge } from '@/components/ui/badge'
import { Collapsible } from '@/components/ui/collapsible'
import { TextLink } from '@/components/ui/text-link'

export interface ReleaseEntry {
  version: string
  date: string
  /** Release notes as markdown. */
  body: string
  /** BCP 47 language tag for externally sourced release notes. */
  contentLocale?: string
  latest?: boolean
}

export function ReleaseHistory({
  releases,
  copy,
  locale,
}: {
  releases: ReleaseEntry[]
  locale: string
  copy: {
    latest: string
    fullHistory: string
    plugin: string
    desktop: string
    externalContentNotice: string
  }
}) {
  const hasExternalEnglishContent =
    locale.split('-')[0]?.toLowerCase() !== 'en' &&
    releases.some((release) => release.contentLocale === 'en')

  return (
    <div className="mx-auto max-w-2xl">
      {hasExternalEnglishContent && (
        <p className="mb-4 text-center text-xs text-muted-foreground">
          {copy.externalContentNotice}
        </p>
      )}
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
          <div className="pb-5 pl-1" lang={release.contentLocale}>
            <Markdown
              content={release.body}
              className="text-sm [&_h1]:text-base [&_h2]:text-base"
            />
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
