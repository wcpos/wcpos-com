import { ArrowUpRight } from 'lucide-react'
import { Markdown } from '@/components/ui/markdown'
import { Badge } from '@/components/ui/badge'
import { Collapsible } from '@/components/ui/collapsible'
import { StatusBadge } from '@/components/ui/status-badge'
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

/** The first sentence of a release body, as plain text: the collapsed row's summary. */
export function firstSentence(body: string): string {
  const line = body.trim().split('\n')[0] ?? ''
  const text = line
    .replace(/^\s*(?:[-*]|#+)\s+/, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__|`/g, '')
    .replace(/^_|_$/g, '')
  return text.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? text
}

// Notes with this section ask some stores to act before or after updating.
export const UPGRADE_SECTION = /^#{1,6}\s+Upgrade and compatibility\b/im

/** Markdown classes for GitHub release notes: long code tokens and links wrap instead of scrolling the page. */
export const notesClassName =
  'text-sm [&_h1]:text-base [&_h2]:text-base [&_code]:[overflow-wrap:anywhere] [&_a]:break-words'

export function FullHistoryLinks({
  copy,
  className,
  external,
}: {
  copy: { fullHistory: string; plugin: string; desktop: string }
  className?: string
  /** Mark each link with ↗: it leaves the site for GitHub. */
  external?: boolean
}) {
  const arrow = external && <ArrowUpRight className="ml-1 inline size-4 align-text-bottom" aria-hidden="true" />
  return (
    <p className={className ?? 'mt-8 text-center text-sm text-muted-foreground'}>
      {copy.fullHistory}{' '}
      <TextLink href="https://github.com/wcpos/woocommerce-pos/releases">
        {copy.plugin}
        {arrow}
      </TextLink>{' '}
      ·{' '}
      <TextLink href="https://github.com/wcpos/electron/releases">
        {copy.desktop}
        {arrow}
      </TextLink>
    </p>
  )
}

function ReleaseNotes(props: { body: string; clamp?: boolean; showAll: string; locale: string }) {
  const { preview, rest } = props.clamp
    ? splitReleaseNotes(props.body)
    : { preview: props.body, rest: null }
  return (
    <>
      <Markdown
        content={preview}
        className={notesClassName}
      />
      {rest !== null && (
        <Collapsible
          summaryClassName="py-2 text-sm font-medium text-wcpos-red-accent"
          summary={<span lang={props.locale}>{props.showAll}</span>}
        >
          <Markdown
            content={rest}
            className={notesClassName}
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
  summaries,
}: {
  releases: ReleaseEntry[]
  locale: string
  /** Renders each release's summary row as this heading level for the host page's outline; omitting it keeps the plain row. */
  headingLevel?: 2 | 3
  /** Opens the newest x.y.0 release instead of the first row; falls back to the first row when none is listed. */
  openFeatureRelease?: boolean
  /** Shows only the start of long notes, with the rest behind a closed "show all" disclosure; omitting it renders every note in full. */
  clampLongNotes?: boolean
  /** Changelog layout: a date column, the first sentence of each closed row's notes, an "action may be needed" marker, and no trailing history links (the host places them). */
  summaries?: boolean
  copy: {
    latest: string
    fullHistory: string
    plugin: string
    desktop: string
    externalContentNotice: string
    /** Template for the disclosure summary; `{version}` is replaced with the release version. */
    showAllNotes?: string
    actionNeeded?: string
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
    <div className={summaries ? 'border-t' : 'mx-auto max-w-2xl'}>
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
          summaryClassName={summaries ? 'items-start py-4' : 'py-4'}
          summary={
            <SummaryTag
              className={summaries ? 'grid flex-1 gap-1.5 md:grid-cols-[150px_minmax(0,1fr)] md:gap-6' : 'flex items-center gap-3'}
            >
              <span className={summaries ? 'flex flex-col gap-0.5' : 'contents'}>
                <span className="flex items-center gap-3">
                  <span className="font-mono text-base font-medium">
                    {release.version}
                  </span>
                  {release.latest && <Badge variant="brand-tint">{copy.latest}</Badge>}
                </span>
                <span className="text-sm text-muted-foreground">
                  {release.date}
                </span>
              </span>
              {summaries && (
                <span className="text-sm text-muted-foreground group-open:hidden">
                  <span className="block" lang={release.contentLocale}>
                    {firstSentence(release.body)}
                  </span>
                  {UPGRADE_SECTION.test(release.body) && (
                    <StatusBadge tone="caution" className="mt-2">
                      {copy.actionNeeded}
                    </StatusBadge>
                  )}
                </span>
              )}
            </SummaryTag>
          }
        >
          <div
            className={summaries ? 'pb-6 md:pl-[174px] md:pr-10' : 'pb-5 pl-1'}
            lang={release.contentLocale}
          >
            <ReleaseNotes
              body={release.body}
              clamp={clampLongNotes}
              showAll={(copy.showAllNotes ?? '').replace('{version}', release.version)}
              locale={locale}
            />
          </div>
        </Collapsible>
      ))}

      {!summaries && <FullHistoryLinks copy={copy} />}
    </div>
  )
}
