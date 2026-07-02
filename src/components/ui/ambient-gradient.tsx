'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * AmbientGradient — the site's signature animated backdrop.
 *
 * Original implementation (Stripe-inspired in spirit, not in code): a tiny
 * WebGL fragment shader runs domain-warped value noise through the brand
 * palette inside a diagonal band, fading to warm white where copy sits.
 * Motion drifts slowly upward — an echo of the homepage's coffee steam —
 * rather than Stripe's horizontal wave.
 *
 * Behaviour:
 * - rAF only while on screen (IntersectionObserver) and the tab is visible
 * - prefers-reduced-motion renders a single static frame
 * - no WebGL (or context loss) → static CSS gradient fallback
 * - DPR capped at 1.5: it's a blurry gradient, extra pixels buy nothing
 */

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_t;
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = uv * vec2(u_res.x / u_res.y, 1.0) * 1.6;
  float t = u_t * 0.05;

  // warm updraft: the domain warp rises rather than scrolling sideways
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, t * 0.8)));
  float f = fbm(p + 2.2 * q + vec2(t * 0.6, -t));

  vec3 col = mix(u_c0, u_c1, smoothstep(0.25, 0.55, f));
  col = mix(col, u_c2, smoothstep(0.5, 0.8, q.x));
  col = mix(col, u_c3, smoothstep(0.6, 0.95, q.y) * 0.8);

  // our diagonal: bottom-left to upper-right, easing to cool white outside
  float d = uv.x + (1.0 - uv.y) * 0.9;
  float band = smoothstep(0.1, 0.65, d - 0.35) * (1.0 - smoothstep(0.9, 1.35, d));
  vec3 base = vec3(0.984, 0.988, 0.996);
  col = mix(base, col, band * 0.85);

  gl_FragColor = vec4(col, 1.0);
}
`

// calm professional blues (owner call: warm reds were unsettling as a
// backdrop; brand red stays confined to small accents like CTAs). The mid
// tones anchor to the POS app's own UI blue; the purple is a whisper of Woo.
const DEFAULT_COLORS: [string, string, string, string] = [
  '#a7cdf2',
  '#6aa5dd',
  '#2b6cb0',
  '#8b7cf6',
]

function hexToVec3(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16)
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ]
}

const FALLBACK_BG =
  'radial-gradient(ellipse 60% 70% at 72% 22%, #6aa5dd55, transparent 70%),' +
  'radial-gradient(ellipse 55% 65% at 88% 60%, #a7cdf24d, transparent 70%),' +
  'radial-gradient(ellipse 50% 60% at 55% 95%, #8b7cf640, transparent 70%),' +
  '#fbfcfe'

export function AmbientGradient({
  className,
  colors = DEFAULT_COLORS,
}: {
  className?: string
  colors?: [string, string, string, string]
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [fallback, setFallback] = React.useState(false)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', {
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    })
    if (!gl) {
      setFallback(true)
      return
    }

    function compile(type: number, source: string) {
      const shader = gl!.createShader(type)
      if (!shader) return null
      gl!.shaderSource(shader, source)
      gl!.compileShader(shader)
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) return null
      return shader
    }

    const vert = compile(gl.VERTEX_SHADER, VERT)
    const frag = compile(gl.FRAGMENT_SHADER, FRAG)
    const program = gl.createProgram()
    if (!vert || !frag || !program) {
      setFallback(true)
      return
    }
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setFallback(true)
      return
    }
    gl.useProgram(program)

    // one fullscreen triangle
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    )
    const aPos = gl.getAttribLocation(program, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(program, 'u_res')
    const uTime = gl.getUniformLocation(program, 'u_t')
    const uniforms = ['u_c0', 'u_c1', 'u_c2', 'u_c3'].map((name, i) => {
      const location = gl.getUniformLocation(program, name)
      gl.uniform3fv(location, hexToVec3(colors[i]))
      return location
    })
    void uniforms

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    function resize() {
      if (!canvas || !gl) return
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
      }
      gl.uniform2f(uRes, canvas.width, canvas.height)
    }
    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)

    const started = performance.now()
    function drawFrame() {
      if (!gl) return
      gl.uniform1f(uTime, (performance.now() - started) / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    let frame = 0
    let running = false
    const tick = () => {
      drawFrame()
      frame = requestAnimationFrame(tick)
    }
    const start = () => {
      if (!running) {
        running = true
        frame = requestAnimationFrame(tick)
      }
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(frame)
    }

    const onContextLost = (event: Event) => {
      event.preventDefault()
      stop()
      setFallback(true)
    }
    canvas.addEventListener('webglcontextlost', onContextLost)

    if (reducedMotion) {
      drawFrame()
      resizeObserver.disconnect()
      return () => {
        canvas.removeEventListener('webglcontextlost', onContextLost)
      }
    }

    let isIntersecting = false
    const updateRunning = () => {
      if (isIntersecting && !document.hidden) start()
      else stop()
    }

    const io = new IntersectionObserver(([entry]) => {
      isIntersecting = Boolean(entry?.isIntersecting)
      updateRunning()
    })
    io.observe(canvas)
    const onVisibility = updateRunning
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      io.disconnect()
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('webglcontextlost', onContextLost)
    }
  }, [colors])

  if (fallback) {
    return (
      <div
        aria-hidden="true"
        className={cn('pointer-events-none h-full w-full', className)}
        style={{ background: FALLBACK_BG }}
        data-testid="ambient-gradient-fallback"
      />
    )
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn('pointer-events-none h-full w-full', className)}
      data-testid="ambient-gradient"
    />
  )
}
