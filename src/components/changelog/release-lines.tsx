import type { ReactNode } from 'react'
import { ArrowDown } from 'lucide-react'
import type { useTranslations } from 'next-intl'
import { notesClassName } from '@/components/downloads/release-history'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Collapsible } from '@/components/ui/collapsible'
import { Markdown } from '@/components/ui/markdown'
import { StatusBadge } from '@/components/ui/status-badge'
import { TextLink } from '@/components/ui/text-link'
import { cn } from '@/lib/utils'
import {
  upgradePreview,
  type ChangelogRelease,
  type ReleaseLine,
} from './changelog-releases'

type Copy = ReturnType<typeof useTranslations<'changelog.page'>>
interface Props {
  t: Copy
  locale: string
  /** The shared "Latest" badge label. */
  latest: string
}

// The 2.0 upgrade guide: the page-owned steps and the docs page are written
// for this line and release only.
const GUIDE_LINE = '2.0'
const GUIDE_RELEASE = `${GUIDE_LINE}.0`
const WHATS_NEW_URL = 'https://docs.wcpos.com/getting-started/whats-new'

const toggleClass =
  'inline-flex justify-start gap-1.5 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground'
const b = (chunks: ReactNode) => <span className="font-medium">{chunks}</span>

function Status({ release, t }: Pick<Props, 't'> & { release: ChangelogRelease }) {
  const { status } = release
  return (
    <StatusBadge
      tone={status.kind === 'none' ? 'neutral' : 'caution'}
      className="bg-transparent px-0 py-0 text-[13px] dark:bg-transparent"
    >
      {status.kind === 'fixed'
        ? t('status.fixedIn', { version: status.version })
        : t(`status.${status.kind}`)}
    </StatusBadge>
  )
}

function Notes({ release, t, locale }: Omit<Props, 'latest'> & { release: ChangelogRelease }) {
  const split = upgradePreview(release.notes)
  return (
    <div lang={release.contentLocale}>
      <Markdown content={split?.preview ?? release.notes} className={notesClassName} />
      {split?.rest && (
        <Collapsible
          className="mt-2"
          summaryClassName={toggleClass}
          summary={
            <span lang={locale}>
              <span className="[[open]>summary>*>&]:hidden">
                {t('showMore', { n: split.restCount })}
              </span>
              <span className="hidden [[open]>summary>*>&]:inline">{t('showFewer')}</span>
            </span>
          }
        >
          <Markdown content={split.rest} className={cn(notesClassName, 'pt-2')} />
        </Collapsible>
      )}
    </div>
  )
}

function ReleaseRow({ release, open, t, locale, latest }: Props & { release: ChangelogRelease; open: boolean }) {
  const { status } = release
  return (
    <Collapsible
      id={`v${release.version}`}
      defaultOpen={open}
      className="scroll-mt-20 border-b"
      summaryClassName="flex-wrap items-start justify-start gap-x-1.5 gap-y-2 py-3.5 lg:py-[18px] [&>svg]:mt-0.5 max-lg:[&>svg]:order-1"
      summary={
        <>
          <div className="grid min-w-0 basis-full grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-1.5 lg:mr-[18px] lg:flex-1 lg:basis-0 lg:grid-cols-[128px_minmax(0,1fr)_176px] lg:gap-x-6">
            <h3 className="flex flex-wrap items-center gap-x-2 gap-y-0.5 lg:flex-col lg:items-start">
              <span className="flex items-center gap-2">
                <span className="font-mono text-base font-medium">{release.version}</span>
                {release.latest && <Badge variant="brand-tint">{latest}</Badge>}
              </span>
              <span className="text-[13px] font-normal text-muted-foreground">{release.date}</span>
            </h3>
            <span className="justify-self-end pt-0.5 lg:col-start-3 lg:row-start-1 lg:justify-self-start">
              <Status release={release} t={t} />
            </span>
            <p
              className="col-span-2 text-[15px] leading-6 lg:col-span-1 lg:col-start-2 lg:row-start-1"
              lang={release.contentLocale}
            >
              {release.summary}
            </p>
          </div>
          {status.kind !== 'none' && (
            <Alert tone="caution" className="basis-full py-1.5 lg:order-1 lg:ml-[152px]">
              {status.kind === 'fixed'
                ? t.rich('noteFixed', { version: status.version, b })
                : t.rich('noteBefore', { b })}
            </Alert>
          )}
          <span className="pt-0.5 text-[13px] font-medium text-muted-foreground max-lg:order-1 [summary:hover>&]:text-foreground">
            {t('releaseNotes')}
          </span>
        </>
      }
    >
      <div className="max-w-3xl pb-6 lg:max-w-[calc(48rem+152px)] lg:pl-[152px]">
        <Notes release={release} t={t} locale={locale} />
      </div>
    </Collapsible>
  )
}

function MajorRelease({ release, t, locale, latest }: Props & { release: ChangelogRelease }) {
  return (
    <div
      id={`v${release.version}`}
      className="scroll-mt-20 border-b py-8 lg:grid lg:grid-cols-[128px_minmax(0,1fr)_176px_120px] lg:gap-x-6 lg:py-9"
    >
      <h3 className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:col-span-2">
        <span className="font-mono text-2xl font-semibold tracking-tight lg:text-[34px] lg:leading-10">
          {release.version}
        </span>
        <Badge variant="muted-tint">{t('majorRelease')}</Badge>
        {release.latest && <Badge variant="brand-tint">{latest}</Badge>}
        <span className="text-sm font-normal text-muted-foreground">{release.date}</span>
      </h3>
      <div className="mt-2 lg:mt-0 lg:self-center">
        <Status release={release} t={t} />
      </div>
      <div className="mt-4 lg:col-span-3 lg:col-start-2">
        <p className="max-w-2xl text-lg lg:text-xl lg:leading-[30px]" lang={release.contentLocale}>
          {release.summary}
        </p>
        {release.version === GUIDE_RELEASE && (
          <Alert tone="caution" title={t('status.before')} className="mt-5 max-w-3xl">
            <ul className="mt-2 grid list-disc gap-x-7 gap-y-1.5 pl-3.5 sm:grid-cols-2">
              {(t.raw('upgradeSteps') as string[]).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </Alert>
        )}
        <Collapsible
          className="mt-4"
          summaryClassName={toggleClass}
          summary={<span>{t('releaseNotes')}</span>}
        >
          <div className="max-w-3xl pt-3">
            <Notes release={release} t={t} locale={locale} />
          </div>
        </Collapsible>
      </div>
    </div>
  )
}

function LineMeta({ line, previous, t }: Pick<Props, 't'> & { line: ReleaseLine; previous?: string }) {
  const { releases } = line
  const first = releases.find((release) => release.version === `${line.line}.0`)
  const meta = 'w-full text-sm text-muted-foreground lg:w-auto'
  return (
    <>
      {first && (
        <p className={meta}>
          {t('lineMeta', { date: first.date, version: releases[0].version })}
          {line.line === GUIDE_LINE && (
            <>
              {' '}
              <TextLink href={WHATS_NEW_URL} arrow>
                {t('whatsNew', { line: line.line })}
              </TextLink>
            </>
          )}
        </p>
      )}
      {!first && previous === GUIDE_LINE && (
        <p className={meta}>{t('previousLine', { next: GUIDE_LINE, version: GUIDE_RELEASE })}</p>
      )}
      {first?.version === GUIDE_RELEASE && (
        <p className="mt-1 w-full text-sm lg:w-auto">
          {t('jump')}{' '}
          <TextLink href={`#v${GUIDE_RELEASE}`} className="inline-flex items-center gap-1">
            {t('jumpLink')}
            <ArrowDown className="size-4" aria-hidden="true" />
          </TextLink>
        </p>
      )}
    </>
  )
}

/** The changelog's releases grouped by line ("2.0", "1.11"): one disclosure row per release, the major release as the line's anchor. */
export function ReleaseLines({ lines, t, locale, latest }: Props & { lines: ReleaseLine[] }) {
  return lines.map((line, index) => (
    <section key={line.line} className="mt-12 first:mt-0 lg:mt-16">
      <div className="flex flex-wrap items-baseline gap-x-2.5 border-b pb-2.5 lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end lg:gap-x-5 lg:pb-3.5">
        <span
          aria-hidden="true"
          className={cn(
            'font-mono text-[28px] leading-8 font-semibold tracking-tight lg:text-[44px] lg:leading-[44px]',
            index > 0 && 'text-muted-foreground',
          )}
        >
          {line.line}
        </span>
        <div className="contents lg:block">
          <h2 className="text-[17px] leading-6 font-semibold tracking-tight lg:text-xl">
            {`WCPOS ${line.line}`}
          </h2>
          <LineMeta line={line} previous={lines[index - 1]?.line} t={t} />
        </div>
      </div>
      {line.releases.map((release) =>
        release.major ? (
          <MajorRelease key={release.version} release={release} t={t} locale={locale} latest={latest} />
        ) : (
          <ReleaseRow
            key={release.version}
            release={release}
            open={release.latest}
            t={t}
            locale={locale}
            latest={latest}
          />
        ),
      )}
    </section>
  ))
}
