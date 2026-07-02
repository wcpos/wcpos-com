import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { AmbientGradient } from './ambient-gradient'

type IntersectionCallback = (
  entries: Array<Pick<IntersectionObserverEntry, 'isIntersecting'>>
) => void

const webgl = {
  VERTEX_SHADER: 1,
  FRAGMENT_SHADER: 2,
  COMPILE_STATUS: 3,
  LINK_STATUS: 4,
  ARRAY_BUFFER: 5,
  STATIC_DRAW: 6,
  FLOAT: 7,
  TRIANGLES: 8,
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
}

function stubMatchMedia({ reducedMotion }: { reducedMotion: boolean }) {
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
}

function stubObservers(onIntersection?: (callback: IntersectionCallback) => void) {
  class MockResizeObserver {
    observe = vi.fn()
    disconnect = vi.fn()
  }
  class MockIntersectionObserver {
    observe = vi.fn()
    disconnect = vi.fn()

    constructor(callback: IntersectionCallback) {
      onIntersection?.(callback)
    }
  }
  vi.stubGlobal('ResizeObserver', MockResizeObserver)
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
}

function stubWebglContext(context: WebGLRenderingContext | null = webgl as unknown as WebGLRenderingContext) {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('AmbientGradient', () => {
  it('sizes the CSS fallback like the canvas path', () => {
    stubWebglContext(null)

    render(<AmbientGradient />)

    expect(screen.getByTestId('ambient-gradient-fallback')).toHaveClass(
      'h-full',
      'w-full'
    )
  })

  it('keeps context-loss fallback active under reduced motion', () => {
    stubMatchMedia({ reducedMotion: true })
    stubObservers()
    stubWebglContext()

    render(<AmbientGradient />)

    const canvas = screen.getByTestId('ambient-gradient')
    act(() => {
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
    })

    expect(screen.getByTestId('ambient-gradient-fallback')).toBeInTheDocument()
  })

  it('does not resume animation on visibilitychange while offscreen', () => {
    let intersectionCallback: IntersectionCallback | undefined
    const requestAnimationFrame = vi.fn(() => 1)
    stubMatchMedia({ reducedMotion: false })
    stubObservers((callback) => {
      intersectionCallback = callback
    })
    stubWebglContext()
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrame)
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    render(<AmbientGradient />)

    act(() => {
      intersectionCallback?.([{ isIntersecting: false }])
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(requestAnimationFrame).not.toHaveBeenCalled()
  })
})
