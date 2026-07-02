'use client'

import * as React from 'react'
import {
  AmbientGradient,
  DotOrbit,
  Reveal,
  SpikeBurst,
} from '@/components/motion'
import { Section } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'
import { Badge } from '@/components/ui/badge'

/**
 * Evaluation page for the motion kit (ADR 0013). Each band shows one
 * primitive with the notes a page author needs: what it is, when to reach
 * for it, and the behaviours it guarantees (IO/visibility gating, reduced
 * motion, DPR caps).
 */

function KitNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-muted-foreground">
      {children}
    </p>
  )
}

// blue-led recolor of the homepage ring, to show the palette prop
const BLUE_ORBIT_PALETTE = [
  'rgba(91, 141, 239, 0.6)',
  'rgba(138, 210, 255, 0.65)',
  'rgba(43, 108, 176, 0.55)',
  'rgba(255, 158, 200, 0.55)',
  'rgba(255, 215, 106, 0.6)',
]

const REVEAL_CARDS = [
  {
    title: 'transform + opacity only',
    body: 'Compositor-friendly: no layout shift, no paint storms. The card rises 16px and fades in.',
  },
  {
    title: 'under 500ms',
    body: 'Interaction feedback is fast (motion rule 3): 450ms with a soft ease-out, once per element.',
  },
  {
    title: 'reduced-motion aware',
    body: 'With prefers-reduced-motion the wrapper renders a plain div — visible immediately, nothing animates.',
  },
  {
    title: 'stagger via delay',
    body: 'Siblings pass small delay steps (these cards use 90ms). Keep it a beat, not choreography.',
  },
]

export function MotionKitDemo() {
  return (
    <main>
      {/* ——— Flagship: SpikeBurst ——— */}
      <Section spacing="hero" className="relative overflow-hidden">
        <div className="flex flex-col items-center gap-2 text-center">
          <Badge variant="secondary">Prototype — motion kit evaluation</Badge>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            The motion kit
          </h1>
          <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
            ADR 0013 in one page: <code>motion</code> for scroll and springs,{' '}
            <code>three</code> + R3F for component-scale 3D, and the two
            custom canvas primitives. Move your mouse.
          </p>
        </div>

        <div className="relative mx-auto mt-4 h-[420px] w-full max-w-xl md:h-[520px]">
          <SpikeBurst className="h-full w-full" />
        </div>
        <KitNote>
          <strong>SpikeBurst</strong> — lazy R3F canvas (~300 spikes, two draw
          calls) that mounts only near the viewport, pauses off-screen and on
          hidden tabs, tilts toward the pointer over a slow idle spin, and
          holds a static pose under reduced motion. DPR capped at 1.5.
        </KitNote>
      </Section>

      {/* ——— AmbientGradient ——— */}
      <Section tone="muted">
        <SectionHeading
          align="center"
          eyebrow="Signature backdrop"
          title="AmbientGradient"
          subtitle="The site's one WebGL gradient surface — domain-warped noise through the backdrop palette, terraced contours, a bright filament."
        />
        <Reveal className="mt-10">
          <div className="relative mx-auto h-72 max-w-4xl overflow-hidden rounded-2xl border shadow-sm md:h-96">
            <AmbientGradient className="absolute inset-0" />
            <div className="relative flex h-full items-end p-6">
              <p className="max-w-sm text-sm text-slate-700">
                Copy sits on the cool-white side of the diagonal band. Static
                CSS fallback without WebGL; single frame under reduced motion.
              </p>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* ——— DotOrbit ——— */}
      <Section>
        <SectionHeading
          align="center"
          eyebrow="Canvas primitive"
          title="DotOrbit"
          subtitle="The homepage act-4 ring, generalized: dot count, size, ring radius and palette are props. Defaults reproduce the homepage exactly."
        />
        <div className="mt-10 grid items-center justify-items-center gap-8 md:grid-cols-2">
          <Reveal>
            <figure className="flex flex-col items-center">
              <div className="h-[340px] w-[340px] overflow-hidden">
                <DotOrbit
                  size={340}
                  ringRadius={120}
                  className="[transform:translateZ(0)]"
                />
              </div>
              <figcaption className="mt-2 text-sm text-muted-foreground">
                Homepage defaults (scaled)
              </figcaption>
            </figure>
          </Reveal>
          <Reveal delay={0.09}>
            <figure className="flex flex-col items-center">
              <div className="h-[340px] w-[340px] overflow-hidden">
                <DotOrbit
                  size={340}
                  ringRadius={120}
                  dots={190}
                  palette={BLUE_ORBIT_PALETTE}
                />
              </div>
              <figcaption className="mt-2 text-sm text-muted-foreground">
                Denser, blue-led palette via props
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </Section>

      {/* ——— Reveal ——— */}
      <Section tone="muted">
        <SectionHeading
          align="center"
          eyebrow="Scroll primitive"
          title="Reveal"
          subtitle="The building block for every non-homepage page: fade + lift on scroll-into-view."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REVEAL_CARDS.map((card, index) => (
            <Reveal key={card.title} delay={index * 0.09}>
              <div className="h-full rounded-xl border bg-white p-5 shadow-sm dark:bg-slate-950">
                <h3 className="text-sm font-semibold">{card.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {card.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <KitNote>
          Everything above honours prefers-reduced-motion — flip it in your OS
          settings and reload: static gradient frame, static ring, static
          burst, no reveals.
        </KitNote>
      </Section>
    </main>
  )
}
