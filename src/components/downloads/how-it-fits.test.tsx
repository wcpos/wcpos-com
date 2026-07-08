import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { HowItFits } from './how-it-fits'

const TEST_COPY = {
  eyebrow: 'Translated eyebrow',
  title: 'Translated title',
  points: {
    setup: {
      title: 'Translated setup title',
      body: 'Translated setup body',
    },
    sync: {
      title: 'Translated sync title',
      body: 'Translated sync body',
    },
    offline: {
      title: 'Translated offline title',
      body: 'Translated offline body',
    },
  },
  syncLabel: 'Translated sync label',
  chips: {
    c1: 'Translated chip 1',
    c2: 'Translated chip 2',
    c3: 'Translated chip 3',
    c4: 'Translated chip 4',
    c5: 'Translated chip 5',
  },
  diagram: {
    ariaLabel: 'Translated diagram aria label',
    devices: {
      desktop: 'Translated desktop',
      ios: 'Translated iPhone and iPad',
      android: 'Translated Android',
      web: 'Translated Web',
    },
    hub: {
      store: 'Translated store',
      platform: 'Translated platform',
      plugin: 'Translated plugin',
    },
  },
} as const

// @ts-expect-error HowItFits must receive locale-specific copy from its page.
const missingCopyElement = <HowItFits />
void missingCopyElement

describe('HowItFits', () => {
  it('renders the sync diagram with the hub and all four device spheres', () => {
    render(<HowItFits copy={TEST_COPY} />)

    expect(
      screen.getByRole('img', { name: /Translated diagram aria label/ }),
    ).toBeInTheDocument()
    expect(screen.getByText('Translated store')).toBeInTheDocument()
    for (const label of [
      'Translated desktop',
      'Translated iPhone and iPad',
      'Translated Android',
      'Translated Web',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('keeps the explanation copy alongside the diagram', () => {
    render(<HowItFits copy={TEST_COPY} />)

    expect(
      screen.getByRole('heading', {
        name: 'Translated title',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Translated setup title')).toBeInTheDocument()
    expect(
      screen.queryByText('One store at the centre. Every till in sync.')
    ).toBeNull()
  })

  it('highlights device spheres when keyboard focus reaches them', () => {
    render(<HowItFits copy={TEST_COPY} />)

    const desktopWrapper = screen.getByTestId('device-wrapper-desktop')
    const desktopSphere = screen.getByTestId('device-sphere-desktop')

    expect(desktopWrapper).toHaveAttribute('tabindex', '0')

    fireEvent.focus(desktopWrapper)

    expect(desktopSphere).toHaveClass('bg-wcpos-red')

    fireEvent.blur(desktopWrapper)

    expect(desktopSphere).not.toHaveClass('bg-wcpos-red')
  })
})
