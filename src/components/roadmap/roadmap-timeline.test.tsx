import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement } from 'react'
import { RoadmapTimeline, BoardLinkChip } from './roadmap-timeline'
import { ROADMAP_DEV_FIXTURE } from './dev-fixture'
import type { RoadmapData, Release } from '@/types/roadmap'
import messages from '../../../messages/en.json'

const EMPTY: RoadmapData = { now: null, next: [], later: [], shipped: [] }
const release: Release = {
  version: 'v1.11.0', major: 1, minor: 11, theme: 'Checkout & payments',
  dueOn: '2026-10-01T00:00:00Z', why: '**Faster checkout**',
  pitch: 'Keep checkout moving.', notInRelease: '- Fiscal compliance',
  prose: 'Public context', url: 'https://github.com/wcpos/roadmap/issues/11',
  hiddenEpicCount: 3, shippedOn: null,
  epics: Array.from({ length: 13 }, (_, i) => ({
    number: 30 + i, title: `Feature ${i + 1}`, summary: 'Full summary. '.repeat(30),
    pitch: `Feature ${i + 1} makes checkout simpler.`,
    state: i < 5 ? 'done' : 'planned',
    url: `https://github.com/wcpos/roadmap/issues/${30 + i}`,
    progress: { completed: 4, total: 4 },
  })),
}
function renderWithIntl(ui: ReactElement) {
  return render(<NextIntlClientProvider locale="en" messages={messages}>{ui}</NextIntlClientProvider>)
}

describe('RoadmapTimeline', () => {
  it('renders the active release as a compact stop with a linked headline and feature progress', () => {
    const { container } = renderWithIntl(<RoadmapTimeline data={{ ...EMPTY, now: release }} />)
    const heading = screen.getByRole('heading', { level: 3, name: 'v1.11.0 Checkout & payments' })
    expect(heading).toHaveClass('text-2xl', 'sm:text-3xl')
    expect(heading).toHaveAttribute('lang', 'en')
    const link = within(heading).getByRole('link')
    expect(link).toHaveAttribute('href', release.url)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(within(heading).getByText(release.version)).toHaveClass('font-mono', 'text-sm', 'text-wcpos-red-accent')
    expect(screen.getByText('Now')).toHaveClass('bg-wcpos-red')
    expect(screen.getByText('5 of 13 features · due Oct 1, 2026')).toBeInTheDocument()
    expect(container.querySelector('[style="width: 38%;"]')).not.toBeNull()
    expect(screen.getByText(release.pitch)).toHaveAttribute('lang', 'en')
    expect(screen.getByRole('link', { name: 'Full release brief ↗' })).toHaveAttribute('href', release.url)
    expect(screen.queryByText('Faster checkout')).toBeNull()
    expect(screen.queryByText('Fiscal compliance')).toBeNull()
    expect(screen.queryByText('Public context')).toBeNull()
    expect(screen.queryByText(release.epics[0].summary.trim())).toBeNull()
    expect(screen.getAllByText(release.version).find(el => el.getAttribute('aria-hidden') === 'true')).toBeDefined()
  })
  it('links compact feature rows with one-line titles and pitches and optional counts', () => {
    renderWithIntl(<RoadmapTimeline data={{ ...EMPTY, now: {
      ...release, epics: [release.epics[0], { ...release.epics[1], progress: undefined }],
    } }} />)
    const title = screen.getByText('Feature 1')
    expect(title).toHaveClass('line-clamp-1')
    expect(screen.getByText(release.epics[0].pitch)).toHaveClass('line-clamp-1')
    const row = title.closest('a')!
    expect(row).toHaveAttribute('href', release.epics[0].url)
    expect(row).toHaveAttribute('target', '_blank')
    expect(within(row).getByLabelText('Done')).toBeInTheDocument()
    expect(within(row).getByText('4/4')).toBeInTheDocument()
    expect(screen.getAllByText('4/4')).toHaveLength(1)
  })
  it('places later releases after dated releases under the single Next chip', () => {
    const { container } = renderWithIntl(<RoadmapTimeline data={{
      ...EMPTY, next: [release], later: [{ ...release, version: 'v2.0.0', theme: 'Future', dueOn: null, url: `${release.url}0` }],
    }} />)
    const next = screen.getByText('Next').closest('section')!
    expect(screen.getAllByText('Next')).toHaveLength(1)
    expect(within(next).getAllByRole('heading').map(el => el.textContent)).toEqual(['v1.11.0 Checkout & payments', 'v2.0.0 Future'])
    expect(within(next).getByText('5 of 13 features · no date yet')).toBeInTheDocument()
    expect(screen.queryByText('Now')).toBeNull()
    expect(screen.queryByText('Later')).toBeNull()
    expect(screen.queryByText('Shipped')).toBeNull()
    expect(container.querySelectorAll('section')).toHaveLength(1)
  })
  it('renders shipped history with release notes and title-only feature rows, without an empty notice', () => {
    const { container } = renderWithIntl(<RoadmapTimeline data={{ ...EMPTY, shipped: [{ ...release, shippedOn: '2026-09-01T00:00:00Z' }] }} />)
    expect(screen.getByText('shipped · Sep 2026')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Release notes ↗' })).toHaveAttribute('href', 'https://github.com/wcpos/woocommerce-pos/releases/tag/v1.11.0')
    expect(screen.queryByRole('link', { name: 'Full release brief ↗' })).toBeNull()
    expect(screen.getByText('Feature 1').closest('a')).toHaveAttribute('href', release.epics[0].url)
    expect(screen.queryByText(release.epics[0].pitch)).toBeNull()
    expect(screen.queryByText('4/4')).toBeNull()
    expect(container.querySelector('[style*="width:"]')).toBeNull()
    expect(container.querySelector('.opacity-60')).not.toBeNull()
    expect(screen.queryByText(messages.roadmap.timeline.empty)).toBeNull()
  })
  it('omits empty pitches and lists while showing zero release progress', () => {
    const { container } = renderWithIntl(<RoadmapTimeline data={{ ...EMPTY, now: { ...release, pitch: '', epics: [], dueOn: null } }} />)
    expect(screen.getByText('0 of 0 features · no date yet')).toBeInTheDocument()
    expect(container.querySelector('[style="width: 0%;"]')).not.toBeNull()
    expect(screen.queryByRole('list')).toBeNull()
    expect(container.querySelector('p[lang="en"]')).toBeNull()
  })
  it('renders all fixture groups in order and retains the external-content notice', () => {
    const { container } = renderWithIntl(<RoadmapTimeline data={ROADMAP_DEV_FIXTURE} />)
    expect([...container.querySelectorAll('section')].map(section => section.querySelector('.pb-8')?.textContent)).toEqual(['Now', 'Next', 'Shipped'])
    expect(screen.getByText(messages.roadmap.timeline.externalContentNotice)).toBeInTheDocument()
    expect(screen.getByText('Next')).toHaveClass('border-slate-300')
    expect(screen.getByText('Shipped')).toHaveClass('border-emerald-500/40')
  })
  it('renders the existing empty copy when all groups are empty', () => {
    const { container } = renderWithIntl(<RoadmapTimeline data={EMPTY} />)
    expect(screen.getByText(messages.roadmap.timeline.empty)).toBeInTheDocument()
    expect(container.querySelector('section')).toBeNull()
  })
})

it('links the live GitHub chip to release issues', () => {
  renderWithIntl(<BoardLinkChip />)
  expect(screen.getByRole('link', { name: /live from GitHub/ })).toHaveAttribute('href', 'https://github.com/wcpos/roadmap/issues?q=is%3Aissue+label%3Arelease')
})
