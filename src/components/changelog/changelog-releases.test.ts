import { describe, expect, it } from 'vitest'
import { buildReleaseLines, splitSummary, upgradePreview } from './changelog-releases'

const entry = (version: string, body: string) => ({
  version,
  date: 'Nov 1, 2026',
  body,
  contentLocale: 'en',
})

const UPGRADE_NOTES = [
  'Lets a manager reassign a sale. Action may be needed: see Upgrade and compatibility.',
  '### Upgrade and compatibility\n- Custom receipt templates: `qty` is now negative.\n- Extensions that store order meta.',
  '### Added\n- Reassign a sale.',
  '### Fixed\n- Guest payments.\n- Sign-in.',
].join('\n\n')

describe('splitSummary', () => {
  it('moves a one-sentence lead paragraph into the summary and drops the action pointer', () => {
    const { summary, notes } = splitSummary(UPGRADE_NOTES)
    expect(summary).toBe('Lets a manager reassign a sale.')
    expect(notes.startsWith('### Upgrade and compatibility')).toBe(true)
  })

  it('keeps a longer lead paragraph in the notes', () => {
    const body = '**WCPOS 2.0 is a major update.** Update when you have time.\n\n- A bullet.'
    expect(splitSummary(body)).toEqual({ summary: 'WCPOS 2.0 is a major update.', notes: body })
  })

  it('summarises bullet-only notes with the first sentence and keeps every bullet', () => {
    const body = '- **Receipts print each tax.** More detail.\n- Second.'
    expect(splitSummary(body)).toEqual({ summary: 'Receipts print each tax.', notes: body })
  })
})

describe('upgradePreview', () => {
  it('previews the Upgrade and compatibility section and counts the remaining bullets', () => {
    const preview = upgradePreview(splitSummary(UPGRADE_NOTES).notes)
    expect(preview?.preview).toBe(
      '### Upgrade and compatibility\n- Custom receipt templates: `qty` is now negative.\n- Extensions that store order meta.',
    )
    expect(preview?.rest).toBe('### Added\n- Reassign a sale.\n\n### Fixed\n- Guest payments.\n- Sign-in.')
    expect(preview?.restCount).toBe(3)
  })

  it('returns null for notes without the section', () => {
    expect(upgradePreview('- Fixed a thing.')).toBeNull()
  })
})

describe('buildReleaseLines', () => {
  const lines = buildReleaseLines([
    entry('2.0.1', UPGRADE_NOTES),
    entry('2.0.0', '**WCPOS 2.0 is a major update.**'),
    entry('1.11.9', '- **Fixed POS sales saving with no tax** -- a regression in 1.11.8.'),
    entry('1.11.8', '- New sales start from the tax setting.'),
    entry('1.11.7', '- Variations load.'),
  ])

  it('groups releases by major.minor line, newest first', () => {
    expect(lines.map((line) => [line.line, line.releases.map((r) => r.version)])).toEqual([
      ['2.0', ['2.0.1', '2.0.0']],
      ['1.11', ['1.11.9', '1.11.8', '1.11.7']],
    ])
    expect(lines[0].releases[0].latest).toBe(true)
    expect(lines[0].releases[1].latest).toBe(false)
  })

  it('derives each release status from its notes and from later releases', () => {
    const statuses = Object.fromEntries(
      lines.flatMap((line) => line.releases.map((r) => [r.version, r.status])),
    )
    expect(statuses).toEqual({
      '2.0.1': { kind: 'before' },
      '2.0.0': { kind: 'none' },
      '1.11.9': { kind: 'none' },
      '1.11.8': { kind: 'fixed', version: '1.11.9' },
      '1.11.7': { kind: 'none' },
    })
  })
})
