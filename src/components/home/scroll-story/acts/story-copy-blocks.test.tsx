import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode
    href: string
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

import { CopyAct1, CopyAct2 } from './story-copy-blocks'
import messages from '../../../../../messages/en.json'

afterEach(cleanup)

describe('CopyAct1', () => {
  it.each([
    { name: 'onLight', ui: <CopyAct1 tone="onLight" /> },
    { name: 'default', ui: <CopyAct1 /> },
  ])('drops the 2.0 caption above the kicker and keeps one 2.0 line above the CTAs with $name tone', ({ ui }) => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    )

    const kicker = screen.getByText(messages.home.story.a1.k)
    expect(container.firstElementChild).toBe(kicker)
    const line = screen.getByText('Free in 2.0').closest('p')!
    expect(line).toHaveTextContent(
      'Free in 2.0: split payments, sell when the internet drops, today’s sales.'
    )
    const demo = screen.getByRole('link', { name: messages.home.story.a1.c1 })
    expect(line.compareDocumentPosition(demo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('draws the counter-photo CTAs and eyebrow in ink, the secondary as the white inverse', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <CopyAct1 tone="onLight" />
      </NextIntlClientProvider>
    )

    const { a1 } = messages.home.story
    expect(screen.getByRole('link', { name: a1.c2 })).toHaveClass('bg-white', 'text-slate-900')
    expect(screen.getByText(a1.k)).toHaveClass('text-[#3b2a17]')
    expect(screen.getByText(a1.k)).not.toHaveClass('text-wcpos-red')
    expect(screen.getByText(a1.demoLogin)).toHaveClass('text-[#2a1e10]')
  })

  it.each([
    { name: 'onLight', ui: <CopyAct1 tone="onLight" /> },
    { name: 'default', ui: <CopyAct1 /> },
  ])('stacks the CTAs at one width on phone and balances the heading from sm up with $name tone', ({ ui }) => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    )

    const { a1 } = messages.home.story
    const demo = screen.getByRole('link', { name: a1.c1 })
    const download = screen.getByRole('link', { name: a1.c2 })
    for (const link of [demo, download]) {
      expect(link).toHaveClass('w-full', 'sm:w-auto')
    }
    expect(demo.parentElement).toBe(download.parentElement)
    expect(demo.parentElement).toHaveClass('flex-col', 'sm:flex-row')
    expect(demo.parentElement).not.toHaveClass('flex-wrap')
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveClass('sm:text-balance')
    expect(heading).not.toHaveClass('text-balance')
  })

  it.each([
    { name: 'onLight', ui: <CopyAct1 tone="onLight" /> },
    { name: 'default', ui: <CopyAct1 /> },
  ])('sends Download Free to /downloads and captions the demo login with $name tone', ({ ui }) => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    )

    const { a1 } = messages.home.story
    expect(screen.getByRole('link', { name: a1.c2 })).toHaveAttribute('href', '/downloads')
    const caption = screen.getByText(a1.demoLogin)
    expect(caption).toHaveClass('text-xs')
    const demo = screen.getByRole('link', { name: a1.c1 })
    expect(demo.compareDocumentPosition(caption) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('CopyAct2', () => {
  it.each([
    { tone: 'onLight', ink: 'text-slate-900' },
    { tone: 'themed', ink: 'text-foreground' },
  ] as const)('sets the $tone eyebrow in ink, not brand red', ({ tone, ink }) => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <CopyAct2 tone={tone} />
      </NextIntlClientProvider>
    )

    const kicker = screen.getByText(messages.home.story.a2.k)
    expect(kicker).toHaveClass(ink)
    expect(kicker.className).not.toMatch(/red/)
  })

  it('labels only the iOS and Android chips as beta', () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <CopyAct2 />
      </NextIntlClientProvider>
    )

    const { platforms } = messages.home.story.a2
    expect(screen.getAllByText(platforms.beta)).toHaveLength(2)
    const chip = (name: string) => screen.getByText(name).closest('span')
    for (const name of [platforms.p4, platforms.p5]) {
      expect(chip(name)).toHaveTextContent(platforms.beta)
    }
    for (const name of [platforms.p1, platforms.p2, platforms.p3, platforms.p6]) {
      expect(chip(name)).not.toHaveTextContent(platforms.beta)
    }
  })
})
