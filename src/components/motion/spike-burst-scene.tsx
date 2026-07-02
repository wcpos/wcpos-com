'use client'

import * as React from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'

/**
 * SpikeBurstScene — the three/R3F half of SpikeBurst. Kept in its own module
 * so `three` only loads when the lazy wrapper decides the piece is near the
 * viewport. Import SpikeBurst, not this.
 *
 * Geometry: ~300 thin lines radiate from a common center (fibonacci-sphere
 * directions, deterministic per-spike length jitter), each tipped with a
 * soft round dot. One LineSegments + one Points draw call, unlit materials.
 */

const SPIKES = 300
const INNER_RADIUS = 0.4
const OUTER_RADIUS = 1.05
const MAX_TILT_X = 0.5
const MAX_TILT_Y = 0.7
const IDLE_SPIN = 0.1

// Calm blues carry the piece; pink/yellow are sparse accents (2 in 10) —
// brand red/orange never appears as a wash (backdrop colour rule).
const PALETTE = [
  '#5b8def',
  '#2b6cb0',
  '#8ad2ff',
  '#5b8def',
  '#2b6cb0',
  '#ff9ec8',
  '#5b8def',
  '#8ad2ff',
  '#2b6cb0',
  '#ffd76a',
]

export type SpikeBurstPointer = { x: number; y: number }

function fibonacciDirection(index: number, count: number): THREE.Vector3 {
  const golden = Math.PI * (3 - Math.sqrt(5))
  const y = 1 - (index / (count - 1)) * 2
  const radius = Math.sqrt(Math.max(0, 1 - y * y))
  const theta = golden * index
  return new THREE.Vector3(
    Math.cos(theta) * radius,
    y,
    Math.sin(theta) * radius
  )
}

// deterministic per-spike jitter (no Math.random: same burst every render)
function jitter(index: number): number {
  return Math.abs(Math.sin(index * 12.9898 + 78.233))
}

function buildBurst() {
  const linePositions = new Float32Array(SPIKES * 6)
  const lineColors = new Float32Array(SPIKES * 6)
  const tipPositions = new Float32Array(SPIKES * 3)
  const tipColors = new Float32Array(SPIKES * 3)

  const color = new THREE.Color()
  const paleCenter = new THREE.Color('#eef4fb')

  for (let i = 0; i < SPIKES; i++) {
    const dir = fibonacciDirection(i, SPIKES)
    const length = OUTER_RADIUS * (0.82 + jitter(i) * 0.3)

    color.set(PALETTE[i % PALETTE.length])

    linePositions.set(
      [
        dir.x * INNER_RADIUS,
        dir.y * INNER_RADIUS,
        dir.z * INNER_RADIUS,
        dir.x * length,
        dir.y * length,
        dir.z * length,
      ],
      i * 6
    )
    // fade each spike from a pale center out to its full color at the tip
    const inner = paleCenter.clone().lerp(color, 0.45)
    lineColors.set(
      [inner.r, inner.g, inner.b, color.r, color.g, color.b],
      i * 6
    )

    tipPositions.set([dir.x * length, dir.y * length, dir.z * length], i * 3)
    tipColors.set([color.r, color.g, color.b], i * 3)
  }

  const lineGeometry = new THREE.BufferGeometry()
  lineGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(linePositions, 3)
  )
  lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3))

  const tipGeometry = new THREE.BufferGeometry()
  tipGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(tipPositions, 3)
  )
  tipGeometry.setAttribute('color', new THREE.BufferAttribute(tipColors, 3))

  return { lineGeometry, tipGeometry }
}

// soft round sprite for the tips (Points render square without a map)
function makeDotSprite(): THREE.Texture | null {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const context = canvas.getContext('2d')
  if (!context) return null
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.9)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 64, 64)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function Burst({
  pointer,
  animate,
}: {
  pointer: React.RefObject<SpikeBurstPointer>
  animate: boolean
}) {
  const group = React.useMemo(() => {
    const { lineGeometry, tipGeometry } = buildBurst()
    const sprite = makeDotSprite()

    const lines = new THREE.LineSegments(
      lineGeometry,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
      })
    )
    const tips = new THREE.Points(
      tipGeometry,
      new THREE.PointsMaterial({
        vertexColors: true,
        size: 0.05,
        sizeAttenuation: true,
        map: sprite ?? undefined,
        transparent: true,
        alphaTest: 0.05,
        depthWrite: false,
      })
    )

    const burst = new THREE.Group()
    burst.add(lines, tips)
    // resting pose: slightly tilted so the static frame still has depth
    burst.rotation.set(0.28, -0.4, 0)
    return burst
  }, [])

  React.useEffect(() => {
    return () => {
      for (const child of group.children) {
        const mesh = child as THREE.LineSegments | THREE.Points
        mesh.geometry.dispose()
        const material = mesh.material as THREE.Material & {
          map?: THREE.Texture | null
        }
        material.map?.dispose()
        material.dispose()
      }
    }
  }, [group])

  const groupRef = React.useRef<THREE.Group>(null)
  const idle = React.useRef(0)

  useFrame((_, delta) => {
    const burst = groupRef.current
    if (!burst || !animate) return
    idle.current += delta * IDLE_SPIN

    // orient toward the pointer on top of a gentle idle spin, critically
    // damped so it glides rather than snaps
    const target = pointer.current ?? { x: 0, y: 0 }
    const targetX = 0.28 + target.y * MAX_TILT_X
    const targetY = -0.4 + idle.current + target.x * MAX_TILT_Y
    const ease = 1 - Math.exp(-3.5 * delta)
    burst.rotation.x += (targetX - burst.rotation.x) * ease
    burst.rotation.y += (targetY - burst.rotation.y) * ease
  })

  return <primitive object={group} ref={groupRef} />
}

export default function SpikeBurstScene({
  pointer,
  animate,
  frameloop,
}: {
  pointer: React.RefObject<SpikeBurstPointer>
  /** false = hold the resting pose (reduced motion) */
  animate: boolean
  frameloop: 'always' | 'demand' | 'never'
}) {
  return (
    <Canvas
      frameloop={frameloop}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 2.9], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      style={{ pointerEvents: 'none' }}
    >
      <Burst pointer={pointer} animate={animate} />
    </Canvas>
  )
}
