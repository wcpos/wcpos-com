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

/**
 * Long notes (at least NOTES_CLAMP_MIN_CHARS) show their first
 * NOTES_PREVIEW_BLOCKS blank-line-separated blocks; the rest sit behind a
 * closed disclosure.
 */
export const NOTES_PREVIEW_BLOCKS = 3
export const NOTES_CLAMP_MIN_CHARS = 1500

export function splitReleaseNotes(body: string): { preview: string; rest: string | null } {
  const blocks = body.replace(/\r\n/g, '\n').split(/\n[ \t]*\n/)
  if (body.length < NOTES_CLAMP_MIN_CHARS || blocks.length <= NOTES_PREVIEW_BLOCKS) {
    return { preview: body, rest: null }
  }
  return {
    preview: blocks.slice(0, NOTES_PREVIEW_BLOCKS).join('\n\n'),
    rest: blocks.slice(NOTES_PREVIEW_BLOCKS).join('\n\n'),
  }
}

function ReleaseNotes(props: { body: string; clamp?: boolean; showAll: string; locale: string }) {
  const { preview, rest } = props.clamp
    ? splitReleaseNotes(props.body)
    : { preview: props.body, rest: null }
  return (
    <>
      <Markdown
        content={preview}
        className="text-sm [&_h1]:text-base [&_h2]:text-base [&_code]:break-words [&_a]:break-words"
      />
      {rest !== null && (
        <Collapsible
          summaryClassName="py-2 text-sm font-medium text-wcpos-red-accent"
          summary={<span lang={props.locale}>{props.showAll}</span>}
        >
          <Markdown
            content={rest}
            className="text-sm [&_h1]:text-base [&_h2]:text-base [&_code]:break-words [&_a]:break-words"
          />
        </Collapsible>
      )}
    </>
  )
}

export function ReleaseHistory({
  releases,
  copy,
  locale,
  headingLevel,
  openFeatureRelease,
  clampLongNotes,
}: {
  releases: ReleaseEntry[]
  locale: string
  /** Renders each release's summary row as this heading level for the host page's outline; omitting it keeps the plain row. */
  headingLevel?: 2 | 3
  /** Opens the newest x.y.0 release instead of the first row; falls back to the first row when none is listed. */
  openFeatureRelease?: boolean
  /** Shows only the start of long notes, with the rest behind a closed "show all" disclosure; omitting it renders every note in full. */
  clampLongNotes?: boolean
  copy: {
    latest: string
    fullHistory: string
    plugin: string
    desktop: string
    externalContentNotice: string
    /** Template for the disclosure summary; `{version}` is replaced with the release version. */
    showAllNotes?: string
  }
}) {
  const SummaryTag = headingLevel === 2 ? 'h2' : headingLevel === 3 ? 'h3' : 'span'
  const hasExternalEnglishContent =
    locale.split('-')[0]?.toLowerCase() !== 'en' &&
    releases.some((release) => release.contentLocale === 'en')
  const featureIndex = openFeatureRelease
    ? releases.findIndex((release) => /^\d+\.\d+\.0$/.test(release.version))
    : -1
  const openIndex = featureIndex === -1 ? 0 : featureIndex

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
          defaultOpen={index === openIndex}
          className="border-b"
          summaryClassName="py-4"
          summary={
            <SummaryTag className="flex items-center gap-3">
              <span className="font-mono text-base font-medium">
                {release.version}
              </span>
              {release.latest && <Badge variant="brand-tint">{copy.latest}</Badge>}
              <span className="text-sm text-muted-foreground">
                {release.date}
              </span>
            </SummaryTag>
          }
        >
          <div className="pb-5 pl-1" lang={release.contentLocale}>
            <ReleaseNotes
              body={release.body}
              clamp={clampLongNotes}
              showAll={(copy.showAllNotes ?? '').replace('{version}', release.version)}
              locale={locale}
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
