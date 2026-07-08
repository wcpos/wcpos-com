import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReleaseHistory, type ReleaseEntry } from './release-history'

const baseCopy = {
  latest: 'Latest',
  fullHistory: 'Full history:',
  plugin: 'Plugin',
  desktop: 'Desktop',
  externalContentNotice: 'Release notes come from GitHub and may be shown in English.',
}

describe('ReleaseHistory', () => {
  it('marks GitHub-authored release notes with their source language', () => {
    const releases: ReleaseEntry[] = [
      {
        version: '1.9.6',
        date: 'Jun 17, 2026',
        body: '- Fixed checkout bug',
        contentLocale: 'en',
        isExternalContent: true,
        latest: true,
      },
    ]

    const { container } = render(
      <ReleaseHistory releases={releases} copy={baseCopy} />,
    )

    expect(
      screen.getByText('Release notes come from GitHub and may be shown in English.'),
    ).toBeInTheDocument()
    const localizedRegion = container.querySelector('[lang="en"]')
    expect(localizedRegion).toHaveTextContent('Fixed checkout bug')
  })

  it('does not show the GitHub-English notice for localized fallback notes', () => {
    const releases: ReleaseEntry[] = [
      {
        version: '1.9.6',
        date: 'Jun 17, 2026',
        body: '- Fixed checkout bug',
        contentLocale: 'en',
        latest: true,
      },
    ]

    render(<ReleaseHistory releases={releases} copy={baseCopy} />)

    expect(
      screen.queryByText('Release notes come from GitHub and may be shown in English.'),
    ).not.toBeInTheDocument()
  })
})
