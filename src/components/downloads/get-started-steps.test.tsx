import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { GetStartedSteps, GetStartedStep } from './get-started-steps'

function renderSteps() {
  return render(
    <GetStartedSteps>
      <GetStartedStep step={1}>
        <h3>Install the free plugin</h3>
      </GetStartedStep>
      <GetStartedStep step={2}>
        <h3>Pick your device</h3>
      </GetStartedStep>
      <GetStartedStep step={3}>
        <h3>Want more? Go Pro</h3>
      </GetStartedStep>
    </GetStartedSteps>
  )
}

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GetStartedSteps', () => {
  it('renders the three steps as an ordered list with numbered circles', () => {
    renderSteps()
    const list = screen.getByRole('list')
    expect(list.tagName).toBe('OL')
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    for (const n of ['1', '2', '3']) {
      expect(screen.getByText(n)).toBeInTheDocument()
    }
    expect(
      screen.getByRole('heading', { name: 'Pick your device' })
    ).toBeInTheDocument()
  })

  it('starts circles unlit until the scroll-drawn line reaches them', () => {
    stubReducedMotion(false)
    renderSteps()
    // jsdom has no layout, so no thresholds are crossed — all circles muted.
    expect(screen.getByText('1')).toHaveClass('border-border')
    expect(screen.getByText('1')).not.toHaveClass('border-wcpos-red')
  })

  it('renders all circles lit with reduced motion (static fallback)', () => {
    stubReducedMotion(true)
    renderSteps()
    for (const n of ['1', '2', '3']) {
      expect(screen.getByText(n)).toHaveClass('border-wcpos-red')
    }
  })

  it('throws when a step is used outside the list', () => {
    // Silence React's error boundary logging for the expected throw.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() =>
      render(<GetStartedStep step={1}>x</GetStartedStep>)
    ).toThrow(/within GetStartedSteps/)
    spy.mockRestore()
  })
})
