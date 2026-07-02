import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { AmbientGradient, DotOrbit, Reveal } from '@/components/motion'

const motionMock = vi.hoisted(() => ({ reducedMotion: false }))

const MOTION_ONLY_PROPS = ['initial', 'whileInView', 'viewport', 'transition']

vi.mock('motion/react', async () => {
  const React = await import('react')
  return {
    motion: {
      div: ({
        children,
        ...props
      }: Record<string, unknown> & { children?: React.ReactNode }) => {
        // strip motion-only props so they do not leak onto the DOM node
        const domProps = Object.fromEntries(
          Object.entries(props).filter(
            ([key]) => !MOTION_ONLY_PROPS.includes(key)
          )
        )
        return React.createElement(
          'div',
          { ...domProps, 'data-motion': 'true' },
          children
        )
      },
    },
    useReducedMotion: () => motionMock.reducedMotion,
  }
})

function stubObservers({ reducedMotion = false } = {}) {
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
    }))
  )
  const observe = vi.fn()
  class IntersectionObserverStub {
    observe = observe
    disconnect = vi.fn()
    unobserve = vi.fn()
  }
  class ResizeObserverStub {
    observe = vi.fn()
    disconnect = vi.fn()
    unobserve = vi.fn()
  }
  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub)
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  return { observe }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  motionMock.reducedMotion = false
})

describe('motion kit index', () => {
  it('exports the three primitives', () => {
    expect(AmbientGradient).toBeTypeOf('function')
    expect(DotOrbit).toBeTypeOf('function')
    expect(Reveal).toBeTypeOf('function')
  })
})

describe('Reveal', () => {
  it('wraps children in a whileInView motion element', () => {
    stubObservers()
    render(
      <Reveal className="stagger">
        <p>revealed copy</p>
      </Reveal>
    )

    const text = screen.getByText('revealed copy')
    expect(text).toBeInTheDocument()
    expect(text.parentElement).toHaveAttribute('data-motion', 'true')
    expect(text.parentElement).toHaveClass('stagger')
  })

  it('renders a plain, fully visible div under prefers-reduced-motion', () => {
    stubObservers()
    motionMock.reducedMotion = true
    render(
      <Reveal className="stagger">
        <p>revealed copy</p>
      </Reveal>
    )

    const wrapper = screen.getByText('revealed copy').parentElement
    expect(wrapper).not.toHaveAttribute('data-motion')
    expect(wrapper).toHaveClass('stagger')
  })
})

describe('DotOrbit', () => {
  it('sizes the canvas from the size prop', () => {
    stubObservers()
    render(<DotOrbit size={340} />)

    const canvas = screen.getByTestId('dot-orbit')
    expect(canvas.tagName).toBe('CANVAS')
    expect(canvas).toHaveStyle({ width: '340px', height: '340px' })
    expect(canvas).toHaveAttribute('aria-hidden', 'true')
  })

  it('keeps the homepage default size', () => {
    stubObservers()
    render(<DotOrbit />)

    expect(screen.getByTestId('dot-orbit')).toHaveStyle({
      width: '520px',
      height: '520px',
    })
  })
})

describe('AmbientGradient', () => {
  it('falls back to the static CSS gradient when WebGL is unavailable', async () => {
    stubObservers()
    // jsdom canvases have no webgl context — getContext returns null
    render(<AmbientGradient />)

    const fallback = await screen.findByTestId('ambient-gradient-fallback')
    expect(fallback).toHaveAttribute('aria-hidden', 'true')
    await waitFor(() =>
      expect(screen.queryByTestId('ambient-gradient')).not.toBeInTheDocument()
    )
  })
})
