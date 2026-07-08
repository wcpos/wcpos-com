import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot, type Root } from 'react-dom/client'
import { SyncDiagram, type SyncDiagramLabels } from './sync-diagram'

/**
 * Regression: the device wrappers' interactive props (tabIndex, hover
 * handlers) are gated on prefers-reduced-motion. Motion's useReducedMotion
 * reported the real media-query value during the hydration render while the
 * server had rendered the motion-enabled markup, so reduced-motion users got
 * a hydration-mismatch warning (tabIndex="0" vs undefined). The component now
 * reads the preference through an SSR-safe hook whose hydration snapshot
 * matches the server; the real preference applies right after hydration.
 */


const EN_LABELS: SyncDiagramLabels = {
  ariaLabel:
    'A WooCommerce store with the WCPOS plugin sits at the centre, connected over a REST API to the desktop, iOS, Android and web apps, which all stay in sync.',
  devices: {
    desktop: 'Desktop',
    ios: 'iOS & iPad',
    android: 'Android',
    web: 'Web',
  },
  hub: {
    store: 'Your store',
    platform: 'WooCommerce',
    plugin: '+ WCPOS plugin',
  },
}

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

describe('SyncDiagram translations', () => {
  it('renders translated accessible and device labels', () => {
    const html = renderToString(
      <SyncDiagram
        labels={{
          ariaLabel: 'Localized sync diagram',
          devices: {
            desktop: 'Bureau',
            ios: 'iPhone et iPad',
            android: 'Android',
            web: 'Web',
          },
          hub: {
            store: 'Votre boutique',
            platform: 'WooCommerce',
            plugin: '+ extension WCPOS',
          },
        }}
      />,
    )

    expect(html).toContain('aria-label="Localized sync diagram"')
    expect(html).toContain('Bureau')
    expect(html).toContain('iPhone et iPad')
    expect(html).toContain('Votre boutique')
    expect(html).toContain('+ extension WCPOS')
    expect(html).not.toContain('Desktop')
    expect(html).not.toContain('iOS &amp; iPad')
  })
})

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
    const html = renderToString(<SyncDiagram labels={EN_LABELS} />)
    expect(html).toContain('tabindex="0"')

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    host = container

    await act(async () => {
      root = hydrateRoot(container, <SyncDiagram labels={EN_LABELS} />)
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

    const html = renderToString(<SyncDiagram labels={EN_LABELS} />)
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    host = container

    await act(async () => {
      root = hydrateRoot(container, <SyncDiagram labels={EN_LABELS} />)
    })

    expect(errorSpy).not.toHaveBeenCalled()
    expect(
      container.querySelector('[data-testid="device-wrapper-desktop"]'),
    ).toHaveAttribute('tabindex', '0')
  })
})
