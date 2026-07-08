import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement } from 'react'
import { RoadmapTimeline, BoardLinkChip } from './roadmap-timeline'
import { BugFixList } from './bug-fix-list'
import { ROADMAP_DEV_FIXTURE } from './dev-fixture'
import type { RoadmapData } from '@/types/roadmap'
import messages from '../../../messages/en.json'

const EMPTY: RoadmapData = { active: [], upcoming: [], shipped: [] }

function renderWithIntl(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe('RoadmapTimeline', () => {
  it('renders the three rail groups with their milestones', () => {
    renderWithIntl(<RoadmapTimeline data={ROADMAP_DEV_FIXTURE} />)
    expect(screen.getByText('Now')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(screen.getByText('Shipped')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'v1.10.0' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'v1.11.0' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'v1.9.x' })).toBeInTheDocument()
  })

  it('marks GitHub-authored roadmap details with their source language', () => {
    const { container } = renderWithIntl(
      <RoadmapTimeline data={ROADMAP_DEV_FIXTURE} />,
    )

    expect(
      screen.getByText(
        'Roadmap item details come from GitHub and may be shown in English.',
      ),
    ).toBeInTheDocument()
    expect(
      container.querySelector('[lang="en"] h3') ??
        container.querySelector('h3[lang="en"]'),
    ).toHaveTextContent('v1.10.0')
    expect(
      screen
        .getByText(/Offline & stock-state correctness/)
        .closest('[lang="en"]'),
    ).toHaveTextContent(/Offline & stock-state correctness/)
    expect(
      screen
        .getByText('Sync engine & offline overhaul: queuing architecture')
        .closest('[lang="en"]'),
    ).toHaveTextContent('Sync engine & offline overhaul: queuing architecture')
  })

  it('lights the active-phase chip and leaves Next/Shipped as outlines until scrolled', () => {
    renderWithIntl(<RoadmapTimeline data={ROADMAP_DEV_FIXTURE} />)
    // "Now" is the active release — always a solid, filled chip.
    const now = screen.getByText('Now')
    expect(now.className).toContain('bg-wcpos-red')
    expect(now.className).toContain('text-white')
    // Next/Shipped start as quiet outlines; they only fill (light up) once
    // their rail scrolls into view, which the browser drives via scroll.
    const next = screen.getByText('Next')
    expect(next.className).toContain('border-slate-300')
    expect(next.className).not.toContain('bg-slate-500')
    const shipped = screen.getByText('Shipped')
    expect(shipped.className).toContain('border-emerald-500/40')
    expect(shipped.className).not.toContain('bg-emerald-500')
  })

  it('omits a rail group when its bucket is empty', () => {
    renderWithIntl(
      <RoadmapTimeline data={{ ...ROADMAP_DEV_FIXTURE, upcoming: [] }} />,
    )
    expect(screen.getByText('Now')).toBeInTheDocument()
    expect(screen.queryByText('Next')).not.toBeInTheDocument()
  })

  it('links feature rows to their GitHub issues', () => {
    renderWithIntl(<RoadmapTimeline data={ROADMAP_DEV_FIXTURE} />)
    const link = screen.getByRole('link', { name: /Split payment support/ })
    expect(link).toHaveAttribute('href', 'https://github.com/wcpos/roadmap/issues/3')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('shows progress as "n of m done" for open milestones and "shipped" for closed', () => {
    renderWithIntl(<RoadmapTimeline data={ROADMAP_DEV_FIXTURE} />)
    expect(screen.getByText(/3 of 9 done/)).toBeInTheDocument()
    expect(screen.getAllByText(/shipped ·|^shipped$/i).length).toBeGreaterThan(0)
  })

  it('renders the ghost numeral only for short version-style titles', () => {
    renderWithIntl(<RoadmapTimeline data={ROADMAP_DEV_FIXTURE} />)
    // v1.10.0 appears as heading + ghost numeral; the long compliance title only as heading
    expect(screen.getAllByText('v1.10.0')).toHaveLength(2)
    expect(screen.getAllByText('Compliance / Fiscalization')).toHaveLength(1)
  })

  it('formats midnight-UTC due dates in UTC (no previous-month drift)', () => {
    // v1.10.0 in the fixture is due 2026-09-01T00:00:00Z; in a negative-offset
    // timezone a local-time format would render "Aug 2026".
    renderWithIntl(<RoadmapTimeline data={ROADMAP_DEV_FIXTURE} />)
    expect(screen.getByText(/due Sep 2026/)).toBeInTheDocument()
    expect(screen.queryByText(/Aug 2026/)).not.toBeInTheDocument()
  })

  it('renders an empty state when there is no roadmap data', () => {
    renderWithIntl(<RoadmapTimeline data={EMPTY} />)
    expect(
      screen.getByText('No roadmap items to display yet.'),
    ).toBeInTheDocument()
  })
})

describe('BugFixList', () => {
  const bugs = ROADMAP_DEV_FIXTURE.active[0].bugs

  it('is a closed disclosure by default with a count summary', () => {
    const { container } = renderWithIntl(<BugFixList bugs={bugs} />)
    const details = container.querySelector('details') as HTMLDetailsElement
    expect(details.open).toBe(false)
    expect(
      screen.getByText('+ 2 bug fixes & improvements'),
    ).toBeInTheDocument()
  })

  it('pluralizes the summary for a single bug', () => {
    renderWithIntl(<BugFixList bugs={bugs.slice(0, 1)} />)
    expect(screen.getByText('+ 1 bug fix & improvements')).toBeInTheDocument()
  })

  it('links each bug to its GitHub issue', () => {
    renderWithIntl(<BugFixList bugs={bugs} />)
    const link = screen.getByRole('link', {
      name: /Cart: fee lines dropped after cashier switch/,
    })
    expect(link).toHaveAttribute('href', bugs[0].url)
  })

  it('renders nothing when there are no bugs', () => {
    const { container } = renderWithIntl(<BugFixList bugs={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('BoardLinkChip', () => {
  it('links to the public WCPOS project board', () => {
    renderWithIntl(<BoardLinkChip />)
    expect(
      screen.getByRole('link', { name: /live from the WCPOS project board/ }),
    ).toHaveAttribute('href', 'https://github.com/orgs/wcpos/projects/4')
  })
})
