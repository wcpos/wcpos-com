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
      <Section tone="dark" spacing="hero" className="overflow-hidden bg-slate-950">
        <div className="mx-auto max-w-2xl text-center">
          {/* h1 here too: on mobile and reduced-motion renders this variant is
              the only visible one, and a page without a visible h1 loses its
              primary landmark (the pinned copy is display:none there) */}
          <CopyAct1 headingLevel={1} />
        </div>
        <StageStrip className="h-[240px] sm:h-[300px]">
          <DeviceTablet />
        </StageStrip>
      </Section>

      <Section tone="dark" spacing="default" className="overflow-hidden">
        <div className="mx-auto max-w-2xl text-center">
          <CopyAct2 />
        </div>
        <StageStrip className="h-[220px] sm:h-[280px]">
          <DevicePhone />
          <DeviceTablet className="h-[240px] w-[348px]" />
          <DeviceLaptop className="w-[340px]" />
        </StageStrip>
      </Section>

      <Section
        tone="dark"
        spacing="default"
        className={cn('overflow-hidden', styles.slateStudio)}
      >
        <div className="mx-auto max-w-2xl text-center">
          <CopyAct3 />
        </div>
        <StageStrip className="h-[220px] sm:h-[260px]">
          <DevicePrinter />
          <DeviceTerminal />
          <DeviceScanner />
        </StageStrip>
      </Section>

      <Section
        tone="dark"
        spacing="default"
        className={cn('overflow-hidden', styles.slateStudio)}
      >
        <div className="mx-auto max-w-2xl text-center">
          <CopyAct4 />
        </div>
        <StageStrip className="h-[260px] sm:h-[320px]">
          <CloudSync />
        </StageStrip>
      </Section>
    </div>
  )
}
