import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { DiscordWidget } from './discord-widget'

describe('DiscordWidget', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders the WidgetBot channel as a plain iframe', () => {
    const { container } = render(<DiscordWidget />)
    const iframe = screen.getByTitle('Discord chat embed')

    expect(iframe).toBeInstanceOf(HTMLIFrameElement)
    expect(iframe.getAttribute('src')).toBe(
      'https://emerald.widgetbot.io/channels/711884517081612298/1093100746372829254/'
    )
    expect(iframe).toHaveAttribute('allow', 'clipboard-write; fullscreen')
    expect(iframe).toHaveAttribute('loading', 'lazy')
    expect(container.querySelectorAll('iframe')).toHaveLength(1)
  })

  it('renders without console errors or an update-depth loop', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rerender } = render(
      <React.StrictMode><DiscordWidget /></React.StrictMode>
    )

    rerender(<React.StrictMode><DiscordWidget /></React.StrictMode>)
    rerender(<React.StrictMode><DiscordWidget /></React.StrictMode>)

    expect(spy).not.toHaveBeenCalled()
    expect(
      spy.mock.calls.flat().map(String).some((arg) => arg.includes('Maximum update depth'))
    ).toBe(false)
  })
})
