import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoadmapTimeline, BoardLinkChip } from './roadmap-timeline'
import { BugFixList } from './bug-fix-list'
import { ROADMAP_DEV_FIXTURE } from './dev-fixture'
import type { RoadmapData } from '@/types/roadmap'

const EMPTY: RoadmapData = { active: [], upcoming: [], shipped: [] }

describe('RoadmapTimeline', () => {
  it('renders the three rail groups with their milestones', () => {
    render(<RoadmapTimeline data={ROADMAP_DEV_FIXTURE} />)
    expect(screen.getByText('Now')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(screen.getByText('Shipped')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'v1.10.0' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'v1.11.0' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'v1.9.x' })).toBeInTheDocument()
  })

  it('omits a rail group when its bucket is empty', () => {
    render(
      <RoadmapTimeline data={{ ...ROADMAP_DEV_FIXTURE, upcoming: [] }} />,
    )
    expect(screen.getByText('Now')).toBeInTheDocument()
    expect(screen.queryByText('Next')).not.toBeInTheDocument()
  })

  it('links feature rows to their GitHub issues', () => {
    render(<RoadmapTimeline data={ROADMAP_DEV_FIXTURE} />)
    const link = screen.getByRole('link', { name: /Split payment support/ })
    expect(link).toHaveAttribute('href', 'https://github.com/wcpos/roadmap/issues/3')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('shows progress as "n of m done" for open milestones and "shipped" for closed', () => {
    render(<RoadmapTimeline data={ROADMAP_DEV_FIXTURE} />)
    expect(screen.getByText(/3 of 9 done/)).toBeInTheDocument()
    expect(screen.getAllByText(/shipped ·|^shipped$/i).length).toBeGreaterThan(0)
  })

  it('renders the ghost numeral only for short version-style titles', () => {
    render(<RoadmapTimeline data={ROADMAP_DEV_FIXTURE} />)
    // v1.10.0 appears as heading + ghost numeral; the long compliance title only as heading
    expect(screen.getAllByText('v1.10.0')).toHaveLength(2)
    expect(screen.getAllByText('Compliance / Fiscalization')).toHaveLength(1)
  })

  it('renders an empty state when there is no roadmap data', () => {
    render(<RoadmapTimeline data={EMPTY} />)
    expect(
      screen.getByText('No roadmap items to display yet.'),
    ).toBeInTheDocument()
  })
})

describe('BugFixList', () => {
  const bugs = ROADMAP_DEV_FIXTURE.active[0].bugs

  it('is a closed disclosure by default with a count summary', () => {
    const { container } = render(<BugFixList bugs={bugs} />)
    const details = container.querySelector('details') as HTMLDetailsElement
    expect(details.open).toBe(false)
    expect(
      screen.getByText('+ 2 bug fixes & improvements'),
    ).toBeInTheDocument()
  })

  it('pluralizes the summary for a single bug', () => {
    render(<BugFixList bugs={bugs.slice(0, 1)} />)
    expect(screen.getByText('+ 1 bug fix & improvements')).toBeInTheDocument()
  })

  it('links each bug to its GitHub issue', () => {
    render(<BugFixList bugs={bugs} />)
    const link = screen.getByRole('link', {
      name: /Cart: fee lines dropped after cashier switch/,
    })
    expect(link).toHaveAttribute('href', bugs[0].url)
  })

  it('renders nothing when there are no bugs', () => {
    const { container } = render(<BugFixList bugs={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('BoardLinkChip', () => {
  it('links to the public WCPOS project board', () => {
    render(<BoardLinkChip />)
    expect(
      screen.getByRole('link', { name: /live from the WCPOS project board/ }),
    ).toHaveAttribute('href', 'https://github.com/orgs/wcpos/projects/4')
  })
})
