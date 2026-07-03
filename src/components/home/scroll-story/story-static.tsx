import { cn } from '@/lib/utils'
import { Section } from '@/components/ui/section'
import { CloudSync } from './acts/cloud-sync'
import {
  CopyAct1,
  CopyAct2,
  CopyAct3,
  CopyAct4,
} from './acts/story-copy-blocks'
import {
  DeviceLaptop,
  DevicePhone,
  DevicePrinter,
  DeviceScanner,
  DeviceTablet,
  DeviceTerminal,
} from './devices'
import styles from './story.module.css'

/**
 * The scroll story without the scroll: four stacked dark sections with the
 * same copy and device tableaus. Serves small viewports (the fixed-size
 * choreography doesn't fit) and prefers-reduced-motion users.
 */

function StageStrip({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative mt-10 flex items-center justify-center overflow-hidden',
        className
      )}
    >
      <div className="flex origin-center scale-[0.55] items-center justify-center gap-8 sm:scale-75 lg:scale-100">
        {children}
      </div>
    </div>
  )
}

export function StoryStatic() {
  return (
    <div data-testid="story-static">
      <Section tone="none" spacing="hero" className={cn('overflow-hidden', styles.woodCounterLight)}>
        <div className="mx-auto max-w-2xl text-center">
          {/* h1 here too: on mobile and reduced-motion renders this variant is
              the only visible one, and a page without a visible h1 loses its
              primary landmark (the pinned copy is display:none there) */}
          <CopyAct1 headingLevel={1} tone="onLight" />
        </div>
        {/* the counter photo, cropped to the hardware cluster. lazy so the
            desktop render of this hidden variant never downloads it. webp
            only, deliberately: the pinned variant's mobile fallback src is
            the SAME url, so on mobile this is one shared download — an avif
            source here would fork the formats and double-fetch the card */}
        <div className="mx-auto mt-10 max-w-2xl">
          <picture>
            <img
              src="/images/story/counter-photo-card.webp"
              alt="A shop counter with a tablet running the WCPOS register, a receipt printer, a card terminal and a barcode scanner"
              width={1280}
              height={722}
              loading="lazy"
              className="w-full rounded-lg shadow-[0_24px_48px_-24px_rgba(30,20,10,0.5)]"
            />
          </picture>
        </div>
      </Section>

      <Section tone="none" spacing="default" className={cn('overflow-hidden', styles.lightStudio)}>
        <div className="mx-auto max-w-2xl text-center">
          <CopyAct2 tone="onLight" />
        </div>
        <StageStrip className="h-[220px] sm:h-[280px]">
          <DevicePhone />
          <DeviceTablet className="h-[240px] w-[348px]" />
          <DeviceLaptop className="w-[340px]" />
        </StageStrip>
      </Section>

      <Section
        tone="none"
        spacing="default"
        className={cn('overflow-hidden', styles.lightStudio)}
      >
        <div className="mx-auto max-w-2xl text-center">
          <CopyAct3 tone="onLight" />
        </div>
        <StageStrip className="h-[220px] sm:h-[260px]">
          <DevicePrinter />
          <DeviceTerminal />
          <DeviceScanner />
        </StageStrip>
      </Section>

      <Section
        tone="none"
        spacing="default"
        className={cn('overflow-hidden', styles.lightStudio)}
      >
        <div className="mx-auto max-w-2xl text-center">
          <CopyAct4 tone="onLight" />
        </div>
        <StageStrip className="h-[260px] sm:h-[320px]">
          <CloudSync light />
        </StageStrip>
      </Section>
    </div>
  )
}
