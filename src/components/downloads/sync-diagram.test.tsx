import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot, type Root } from 'react-dom/client'
import { SyncDiagram } from './sync-diagram'

/**
 * Regression: the device wrappers' interactive props (tabIndex, hover
 * handlers) are gated on prefers-reduced-motion. Motion's useReducedMotion
 * reported the real media-query value during the hydration render while the
 * server had rendered the motion-enabled markup, so reduced-motion users got
 * a hydration-mismatch warning (tabIndex="0" vs undefined). The component now
 * reads the preference through an SSR-safe hook whose hydration snapshot
 * matches the server; the real preference applies right after hydration.
 */

function stubMatchMedia(reducedMotion: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reducedMotion : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}

describe('SyncDiagram hydration', () => {
  let root: Root | undefined
  let host: HTMLDivElement | undefined

  afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('hydrates server markup without mismatches for reduced-motion users', async () => {
    stubMatchMedia(true)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // The server has no media-query access, so SSR always emits the
    // motion-enabled markup with focusable device wrappers.
    const html = renderToString(<SyncDiagram />)
    expect(html).toContain('tabindex="0"')

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    host = container

    await act(async () => {
      root = hydrateRoot(container, <SyncDiagram />)
    })

    expect(errorSpy).not.toHaveBeenCalled()

    // After hydration the real preference kicks in: the static variant
    // drops the interactive props.
    expect(
      container.querySelector('[data-testid="device-wrapper-desktop"]'),
    ).not.toHaveAttribute('tabindex')
  })

  it('keeps the interactive props after hydration when motion is allowed', async () => {
    stubMatchMedia(false)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const html = renderToString(<SyncDiagram />)
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    host = container

    await act(async () => {
      root = hydrateRoot(container, <SyncDiagram />)
    })

    expect(errorSpy).not.toHaveBeenCalled()
    expect(
      container.querySelector('[data-testid="device-wrapper-desktop"]'),
    ).toHaveAttribute('tabindex', '0')
  })
})
