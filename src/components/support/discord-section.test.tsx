import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement } from 'react'
import { DiscordSection } from './discord-section'
import messages from '../../../messages/en.json'

vi.mock('@/components/support/discord-widget', () => ({
  DiscordWidget: () => <div data-testid="discord-widget" />,
}))

function renderWithIntl(ui: ReactElement) {
  return render(<NextIntlClientProvider locale="en" messages={messages}>{ui}</NextIntlClientProvider>)
}

describe('DiscordSection', () => {
  it('shows an Open chat button and does not mount the widget before a click', () => {
    renderWithIntl(<DiscordSection />)
    expect(screen.queryByTestId('discord-widget')).toBeNull()
    expect(screen.getByRole('button', { name: 'Open chat' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Prefer to talk to a human?' })).toBeInTheDocument()
    expect(screen.getByText('The chat loads from Discord (via WidgetBot) only when you open it.')).toBeInTheDocument()
  })

  it('mounts the Discord widget after Open chat is clicked', async () => {
    renderWithIntl(<DiscordSection />)
    fireEvent.click(screen.getByRole('button', { name: 'Open chat' }))
    expect(await screen.findByTestId('discord-widget')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Prefer to talk to a human?' })).toHaveFocus()
    expect(screen.getByRole('region', { name: 'Prefer to talk to a human?' })).toHaveClass('focus-visible:ring-2')
    expect(screen.getByRole('region', { name: 'Prefer to talk to a human?' })).not.toHaveClass('focus:outline-none')
    expect(screen.queryByRole('button', { name: 'Open chat' })).toBeNull()
  })
})
