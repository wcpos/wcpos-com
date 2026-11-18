import fs from 'node:fs'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  ReleaseHistory,
  splitReleaseNotes,
  type ReleaseEntry,
} from './release-history'

const baseCopy = {
  latest: 'Latest',
  fullHistory: 'Full history:',
  plugin: 'Plugin',
  desktop: 'Desktop',
  externalContentNotice: 'Release notes come from GitHub and may be shown in English.',
}

function openVersions(container: HTMLElement) {
  return Array.from(container.querySelectorAll('details'))
    .filter((details) => details.hasAttribute('open'))
    .map((details) => details.querySelector('.font-mono')?.textContent)
}

function release(version: string, latest = false): ReleaseEntry {
  return { version, date: 'June 17, 2026', body: `- Notes for ${version}`, latest }
}

describe('ReleaseHistory', () => {
  it('opens the newest x.y.0 release with openFeatureRelease, keeping the Latest badge on the first row', () => {
    const releases = [
      release('2.0.4', true),
      release('2.0.3'),
      release('2.0.0'),
      release('1.9.6'),
    ]
    const { container } = render(
      <ReleaseHistory
        releases={releases}
        copy={baseCopy}
        locale="en"
        openFeatureRelease
      />,
    )

    expect(openVersions(container)).toEqual(['2.0.0'])
    const badgeRow = screen.getByText('Latest').closest('summary')
    expect(badgeRow).toHaveTextContent('2.0.4')
  })

  it('opens the first row with openFeatureRelease when no x.y.0 release is listed', () => {
    const { container } = render(
      <ReleaseHistory
        releases={[release('2.0.4', true), release('2.0.3')]}
        copy={baseCopy}
        locale="en"
        openFeatureRelease
      />,
    )

    expect(openVersions(container)).toEqual(['2.0.4'])
  })

  it('opens the first row without openFeatureRelease', () => {
    const { container } = render(
      <ReleaseHistory
        releases={[release('2.0.4', true), release('2.0.0')]}
        copy={baseCopy}
        locale="en"
      />,
    )

    expect(openVersions(container)).toEqual(['2.0.4'])
  })

  it('renders no row headings unless a heading level is given', () => {
    const releases: ReleaseEntry[] = [
      { version: '1.9.6', date: 'June 17, 2026', body: '- Fixed checkout bug' },
    ]
    const { unmount } = render(
      <ReleaseHistory releases={releases} copy={baseCopy} locale="en" />,
    )

    expect(screen.queryAllByRole('heading')).toHaveLength(0)
    unmount()

    render(
      <ReleaseHistory
        releases={releases}
        copy={baseCopy}
        locale="en"
        headingLevel={3}
      />,
    )

    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings).toHaveLength(1)
    expect(headings[0].textContent).toMatch(/^1\.9\.6/)
  })

  it('marks GitHub-authored release notes with their source language and a notice on non-English pages', () => {
    const releases: ReleaseEntry[] = [
      {
        version: '1.9.6',
        date: 'Jun 17, 2026',
        body: '- Fixed checkout bug',
        contentLocale: 'en',
        latest: true,
      },
    ]

    const { container } = render(
      <ReleaseHistory releases={releases} copy={baseCopy} locale="fr" />,
    )

    expect(
      screen.getByText('Release notes come from GitHub and may be shown in English.'),
    ).toBeInTheDocument()
    const localizedRegion = container.querySelector('[lang="en"]')
    expect(localizedRegion).toHaveTextContent('Fixed checkout bug')
  })

  it('does not show the GitHub-English notice on English pages', () => {
    const releases: ReleaseEntry[] = [
      {
        version: '1.9.6',
        date: 'June 17, 2026',
        body: '- Fixed checkout bug',
        contentLocale: 'en',
        latest: true,
      },
    ]

    const { container } = render(
      <ReleaseHistory releases={releases} copy={baseCopy} locale="en" />,
    )

    expect(
      screen.queryByText('Release notes come from GitHub and may be shown in English.'),
    ).not.toBeInTheDocument()
    const localizedRegion = container.querySelector('[lang="en"]')
    expect(localizedRegion).toHaveTextContent('Fixed checkout bug')
  })

  it('does not show the GitHub-English notice for localized fallback notes', () => {
    const releases: ReleaseEntry[] = [
      {
        version: '1.9.6',
        date: '17 juin 2026',
        body: '- Correction du paiement',
        contentLocale: 'fr',
        latest: true,
      },
    ]

    render(<ReleaseHistory releases={releases} copy={baseCopy} locale="fr" />)

    expect(
      screen.queryByText('Release notes come from GitHub and may be shown in English.'),
    ).not.toBeInTheDocument()
  })
})

const LOCALES = ['en', 'de', 'nl', 'fr', 'es', 'pt', 'it', 'ja', 'ko', 'zh']

function block(n: number) {
  return `Block ${n} ${'lorem ipsum dolor sit amet '.repeat(12)}`.trim()
}

const longBlocks = [1, 2, 3, 4, 5, 6].map(block)
const longBody = longBlocks.join('\r\n\r\n')

describe('splitReleaseNotes', () => {
  it('keeps the first three blocks of a long body and puts the rest aside', () => {
    expect(longBody.length).toBeGreaterThan(1500)
    const { preview, rest } = splitReleaseNotes(longBody)

    expect(preview.split('\n\n')).toEqual(longBlocks.slice(0, 3))
    expect(rest?.split('\n\n')).toEqual(longBlocks.slice(3))
  })

  it('returns no rest for a short body or a long body of three blocks', () => {
    const shortBody = [1, 2, 3, 4, 5].map((n) => `Block ${n}`).join('\n\n')
    expect(splitReleaseNotes(shortBody)).toEqual({ preview: shortBody, rest: null })

    const threeBlocks = ['a', 'b', 'c'].map((c) => c.repeat(600)).join('\n\n')
    expect(splitReleaseNotes(threeBlocks)).toEqual({ preview: threeBlocks, rest: null })
  })
})

describe('ReleaseHistory long notes', () => {
  const copy = { ...baseCopy, showAllNotes: 'Show all {version} release notes' }
  const releases: ReleaseEntry[] = [
    { version: '2.0.0', date: 'June 17, 2026', body: longBody, latest: true },
  ]

  it('puts the rest of long notes in a closed nested disclosure with clampLongNotes', () => {
    render(
      <ReleaseHistory releases={releases} copy={copy} locale="en" clampLongNotes />,
    )

    const nested = screen.getByText(/^Block 4 /).closest('details')
    expect(nested).not.toBeNull()
    expect(nested).not.toHaveAttribute('open')
    expect(nested?.querySelector('summary')).toHaveTextContent(
      'Show all 2.0.0 release notes',
    )
    expect(nested).not.toContainElement(screen.getByText(/^Block 1 /))
  })

  it('renders every block with no nested disclosure without clampLongNotes', () => {
    const { container } = render(
      <ReleaseHistory releases={releases} copy={copy} locale="en" />,
    )

    expect(container.querySelectorAll('details details')).toHaveLength(0)
    for (const n of [1, 2, 3, 4, 5, 6]) {
      expect(screen.getByText(new RegExp(`^Block ${n} `))).toBeInTheDocument()
    }
  })

  it('has a showAllNotes template with {version} in every locale', () => {
    for (const locale of LOCALES) {
      const messages = JSON.parse(
        fs.readFileSync(path.resolve(process.cwd(), `messages/${locale}.json`), 'utf8'),
      )
      expect(messages.downloads.releaseHistory.showAllNotes, locale).toContain(
        '{version}',
      )
    }
  })
})
