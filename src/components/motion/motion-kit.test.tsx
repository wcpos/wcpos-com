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
  const resizeObserve = vi.fn()
  const resizeDisconnect = vi.fn()
  class IntersectionObserverStub {
    observe = observe
    disconnect = vi.fn()
    unobserve = vi.fn()
  }
  class ResizeObserverStub {
    observe = resizeObserve
    disconnect = resizeDisconnect
    unobserve = vi.fn()
  }
  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub)
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  return { observe, resizeObserve, resizeDisconnect }
}

function stubAnimationFrame() {
  const requestAnimationFrame = vi.fn(() => 1)
  const cancelAnimationFrame = vi.fn()
  vi.stubGlobal('requestAnimationFrame', requestAnimationFrame)
  vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrame)
  return { requestAnimationFrame, cancelAnimationFrame }
}

function stubMissingCanvasContext() {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
}

function stubCanvas2dContext() {
  const context = {
    scale: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    set fillStyle(_value: string) {},
  } as unknown as CanvasRenderingContext2D
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
  return context
}

function stubWebglContext() {
  const gl = {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    FLOAT: 5126,
    TRIANGLES: 4,
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    useProgram: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    getUniformLocation: vi.fn(() => ({})),
    uniform3fv: vi.fn(),
    viewport: vi.fn(),
    uniform2f: vi.fn(),
    uniform1f: vi.fn(),
    drawArrays: vi.fn(),
  } as unknown as WebGLRenderingContext
  const getContext = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(gl)
  return { gl, getContext }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
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
    stubMissingCanvasContext()
    render(<DotOrbit size={340} />)

    const canvas = screen.getByTestId('dot-orbit')
    expect(canvas.tagName).toBe('CANVAS')
    expect(canvas).toHaveStyle({ width: '340px', height: '340px' })
    expect(canvas).toHaveAttribute('aria-hidden', 'true')
  })

  it('keeps the homepage default size', () => {
    stubObservers()
    stubMissingCanvasContext()
    render(<DotOrbit />)

    expect(screen.getByTestId('dot-orbit')).toHaveStyle({
      width: '520px',
      height: '520px',
    })
  })

  it('draws one static ring under prefers-reduced-motion', () => {
    const { observe } = stubObservers({ reducedMotion: true })
    const { requestAnimationFrame } = stubAnimationFrame()
    const context = stubCanvas2dContext()

    render(<DotOrbit dots={3} />)

    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 520, 520)
    expect(context.arc).toHaveBeenCalledTimes(3)
    expect(requestAnimationFrame).not.toHaveBeenCalled()
    expect(observe).not.toHaveBeenCalled()
  })
})

describe('AmbientGradient', () => {
  it('falls back to the static CSS gradient when WebGL is unavailable', async () => {
    stubObservers()
    stubMissingCanvasContext()
    render(<AmbientGradient />)

    const fallback = await screen.findByTestId('ambient-gradient-fallback')
    expect(fallback).toHaveAttribute('aria-hidden', 'true')
    await waitFor(() =>
      expect(screen.queryByTestId('ambient-gradient')).not.toBeInTheDocument()
    )
  })

  it('draws one frame and keeps resize observation under prefers-reduced-motion', () => {
    const { resizeObserve, resizeDisconnect } = stubObservers({
      reducedMotion: true,
    })
    const { requestAnimationFrame } = stubAnimationFrame()
    const { gl } = stubWebglContext()

    render(<AmbientGradient />)

    expect(gl.drawArrays).toHaveBeenCalledTimes(1)
    expect(requestAnimationFrame).not.toHaveBeenCalled()
    expect(resizeObserve).toHaveBeenCalledWith(
      screen.getByTestId('ambient-gradient')
    )
    expect(resizeDisconnect).not.toHaveBeenCalled()
  })

  it('does not recreate WebGL for a new equal colors array', () => {
    stubObservers()
    stubAnimationFrame()
    const { getContext } = stubWebglContext()
    const colors: [string, string, string, string] = [
      '#8ad2ff',
      '#5b8def',
      '#ff9ec8',
      '#ffd76a',
    ]

    const { rerender } = render(<AmbientGradient colors={[...colors]} />)
    rerender(<AmbientGradient colors={[...colors]} />)

    expect(getContext).toHaveBeenCalledTimes(1)
  })
})
