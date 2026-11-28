import { firstSentence, UPGRADE_SECTION } from '@/components/downloads/release-history'

export type ReleaseStatus =
  | { kind: 'before' }
  | { kind: 'fixed'; version: string }
  | { kind: 'none' }

export interface ChangelogRelease {
  version: string
  date: string
  /** One plain-text sentence from the top of the GitHub notes. */
  summary: string
  /** The notes as markdown, without a lead paragraph the summary already says. */
  notes: string
  contentLocale: string
  latest: boolean
  status: ReleaseStatus
}

export interface ReleaseLine {
  /** "major.minor", e.g. "2.0". */
  line: string
  releases: ChangelogRelease[]
}

// GitHub's lead paragraph ends with this pointer when the notes carry an
// Upgrade and compatibility section; the row's status and note say it instead.
const ACTION_POINTER = /\s*Action may be needed: see Upgrade and compatibility\.?$/
const REGRESSION_IN = /regression in v?(\d+\.\d+\.\d+)/gi
const BLOCK_BREAK = /\n[ \t]*\n/

/**
 * The row's summary and the notes left under it. A lead paragraph that is
 * only the summary sentence (plus GitHub's action pointer) moves into the
 * summary slot; any other lead stays in the notes, so no note is dropped.
 */
export function splitSummary(body: string): { summary: string; notes: string } {
  const summary = firstSentence(body)
  const [lead = '', ...rest] = body.split(BLOCK_BREAK)
  const isParagraph = !/^\s*(?:[-*+]|#|\d+\.)\s/.test(lead)
  const leadText = lead.replace(/\*\*|__|`/g, '').trim().replace(ACTION_POINTER, '')
  return isParagraph && rest.length > 0 && leadText === summary
    ? { summary, notes: rest.join('\n\n') }
    : { summary, notes: body }
}

/**
 * Notes with an Upgrade and compatibility section open on that section alone;
 * the rest, and how many bullets it holds, sit behind a second disclosure.
 */
export function upgradePreview(
  notes: string,
): { preview: string; rest: string; restCount: number } | null {
  const match = UPGRADE_SECTION.exec(notes)
  if (!match) return null
  const level = /^#+/.exec(match[0])?.[0].length ?? 6
  const bodyStart = match.index + match[0].length
  const next = notes.slice(bodyStart).search(new RegExp(`^#{1,${level}}\\s`, 'm'))
  const end = next === -1 ? notes.length : bodyStart + next
  const rest = `${notes.slice(0, match.index)}\n\n${notes.slice(end)}`.trim()
  return {
    preview: notes.slice(match.index, end).trim(),
    rest,
    // Bullets, or blocks when the rest has no list.
    restCount: rest.match(/^\s*(?:[-*+]|\d+\.)\s/gm)?.length ?? rest.split(BLOCK_BREAK).length,
  }
}

/** Newest first in, grouped by major.minor line out, each with its summary and action status. */
export function buildReleaseLines(
  entries: { version: string; date: string; body: string; contentLocale: string }[],
): ReleaseLine[] {
  // A later release that names "a regression in X" is the version that fixes X.
  const fixedIn = new Map<string, string>()
  for (const entry of [...entries].reverse()) {
    for (const [, broken] of entry.body.matchAll(REGRESSION_IN)) {
      if (!fixedIn.has(broken)) fixedIn.set(broken, entry.version)
    }
  }

  const lines: ReleaseLine[] = []
  entries.forEach((entry, index) => {
    const fix = fixedIn.get(entry.version)
    const status: ReleaseStatus = fix
      ? { kind: 'fixed', version: fix }
      : UPGRADE_SECTION.test(entry.body)
        ? { kind: 'before' }
        : { kind: 'none' }
    const { body, ...rest } = entry
    const release = {
      ...rest,
      ...splitSummary(body),
      latest: index === 0,
      status,
    }
    const line = entry.version.split('.').slice(0, 2).join('.')
    const last = lines.at(-1)
    if (last?.line === line) last.releases.push(release)
    else lines.push({ line, releases: [release] })
  })
  return lines
}
