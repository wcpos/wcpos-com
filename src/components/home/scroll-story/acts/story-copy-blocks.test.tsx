import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { CopyAct1 } from './story-copy-blocks'
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
