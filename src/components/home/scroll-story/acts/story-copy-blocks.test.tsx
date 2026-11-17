import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { CopyAct1, CopyAct2 } from './story-copy-blocks'
import messages from '../../../../../messages/en.json'

afterEach(cleanup)

describe('CopyAct1', () => {
  it.each([
    { name: 'onLight', ui: <CopyAct1 tone="onLight" /> },
    { name: 'default', ui: <CopyAct1 /> },
  ])('shows the 2.0 copy before the kicker with $name tone', ({ ui }) => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    )

    const label = screen.getByText(messages.home.story.a1.v2.label)
    const kicker = screen.getByText(messages.home.story.a1.k)
    expect(label).toBeInTheDocument()
    expect(screen.getByText(messages.home.story.a1.v2.text)).toBeInTheDocument()
    expect(label.compareDocumentPosition(kicker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('CopyAct2', () => {
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
    for (const name of [platforms.p1, platforms.p2, platforms.p3]) {
      expect(chip(name)).not.toHaveTextContent(platforms.beta)
    }
  })
})
