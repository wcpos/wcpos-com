import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement } from 'react'
import { RoadmapTimeline, BoardLinkChip } from './roadmap-timeline'
import { ROADMAP_DEV_FIXTURE } from './dev-fixture'
import type { RoadmapData, Release } from '@/types/roadmap'
import messages from '../../../messages/en.json'

const EMPTY: RoadmapData = { now: null, next: [], later: [], shipped: [] }
const release: Release = {
  version: 'v1.11.0', major: 1, minor: 11, theme: 'Checkout & payments',
  dueOn: '2026-10-01', why: '**Faster checkout**', notInRelease: '- Fiscal compliance',
  prose: 'Public context', url: 'https://github.com/wcpos/roadmap/issues/11',
  hiddenEpicCount: 3, shippedOn: null,
  epics: [{ number: 30, title: 'Split payments', summary: 'Full summary. '.repeat(30), state: 'done', url: 'https://github.com/wcpos/roadmap/issues/30', progress: { completed: 4, total: 4 } }],
}
function renderWithIntl(ui: ReactElement) {
  return render(<NextIntlClientProvider locale="en" messages={messages}>{ui}</NextIntlClientProvider>)
}

describe('RoadmapTimeline', () => {
  it('renders now as a hero with a visible-epic fraction, full markdown and cards', () => {
    const { container } = renderWithIntl(<RoadmapTimeline data={{ ...EMPTY, now: release }} />)
    expect(screen.getByRole('heading', { name: release.theme })).toHaveClass('text-4xl', 'sm:text-5xl')
    expect(screen.getByText('Now')).toHaveClass('bg-wcpos-red')
    expect(screen.getByText('1 / 1')).toBeInTheDocument()
    expect(screen.getByText('features done')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Inside v1.11.0' })).toBeInTheDocument()
    expect(screen.getByText('Faster checkout').tagName).toBe('STRONG')
    expect(screen.getByText('Fiscal compliance').tagName).toBe('LI')
    expect(screen.getByText('Public context')).toBeInTheDocument()
    expect(screen.getByText(release.epics[0].summary.trim())).toBeInTheDocument()
    expect(screen.getByText('4/4')).toBeInTheDocument()
    expect(container.querySelector('details')).toBeNull()
    expect(container.querySelector('[class*="line-clamp"]')).toBeNull()
  })
  it('omits the hero without now and renders the Later dotted rail', () => {
    const { container } = renderWithIntl(<RoadmapTimeline data={{ ...EMPTY, later: [{ ...release, dueOn: null }] }} />)
    expect(screen.queryByText('Now')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Inside v1.11.0' })).not.toBeInTheDocument()
    expect(screen.getByText('Later')).toBeInTheDocument()
    expect(screen.getByText('No date yet')).toBeInTheDocument()
    expect(screen.getByText('1 of 1 features done')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'v1.11.0 — Checkout & payments' })).toHaveAttribute('href', release.url)
    expect(screen.getByText(release.epics[0].summary.trim())).toBeInTheDocument()
    expect(container.querySelector('.border-dotted')).not.toBeNull()
  })
  it('renders no-public-items copy for empty hero and train releases', () => {
    renderWithIntl(<RoadmapTimeline data={{ ...EMPTY, now: { ...release, epics: [] }, next: [{ ...release, epics: [] }] }} />)
    expect(screen.getAllByText('No public items yet')).toHaveLength(2)
    // progress is null with no public items: no fraction, no "0 of 0" line
    expect(screen.queryByText('0 / 0')).toBeNull()
    expect(screen.queryByText('0 of 0 features done')).toBeNull()
  })
  it('renders all fixture groups, UTC dates, language markers and the external-content notice', () => {
    renderWithIntl(<RoadmapTimeline data={ROADMAP_DEV_FIXTURE} />)
    for (const phase of ['Now', 'Next', 'Later', 'Shipped']) expect(screen.getByText(phase)).toBeInTheDocument()
    expect(screen.getByText('Due Oct 2026')).toBeInTheDocument()
    expect(screen.getByText('Shipped Sep 2026')).toBeInTheDocument()
    expect(screen.getByText(messages.roadmap.timeline.externalContentNotice)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: release.theme }).closest('[lang="en"]')).not.toBeNull()
    expect(screen.getByText('Next')).toHaveClass('border-slate-300')
    expect(screen.getByText('Shipped')).toHaveClass('border-emerald-500/40')
  })
  it('renders safe GFM markdown with same-tab links, no images and no raw HTML', () => {
    const { container } = renderWithIntl(<RoadmapTimeline data={{ ...EMPTY, now: {
      ...release, why: '[Read more](https://github.com/wcpos/roadmap)\n\n![image](https://example.com/image.png)\n\n<script>alert(1)</script>\n\n~~Old~~',
    } }} />)
    expect(screen.getByRole('link', { name: 'Read more' })).not.toHaveAttribute('target')
    expect(screen.getByRole('link', { name: 'Split payments' })).toHaveAttribute('href', release.epics[0].url)
    expect(container.querySelector('img, script')).toBeNull()
    expect(screen.getByText('Old').tagName).toBe('DEL')
  })
  it('renders the existing empty copy when all groups are empty', () => {
    renderWithIntl(<RoadmapTimeline data={EMPTY} />)
    expect(screen.getByText(messages.roadmap.timeline.empty)).toBeInTheDocument()
  })
  it('renders the empty copy alongside shipped history when no release is open', () => {
    renderWithIntl(<RoadmapTimeline data={{
      ...EMPTY,
      shipped: [{ ...release, shippedOn: '2026-09-01' }],
    }} />)
    expect(screen.getByText(messages.roadmap.timeline.empty)).toBeInTheDocument()
    expect(screen.getByText('Shipped')).toBeInTheDocument()
  })
})

it('links the live GitHub chip to release issues', () => {
  renderWithIntl(<BoardLinkChip />)
  expect(screen.getByRole('link', { name: /live from GitHub/ })).toHaveAttribute('href', 'https://github.com/wcpos/roadmap/issues?q=is%3Aissue+label%3Arelease')
})
