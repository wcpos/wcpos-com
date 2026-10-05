import { useTranslations } from 'next-intl'
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

// Both images use the same srcset and sizes to share one mobile download.
export const COUNTER_CARD_SRC = '/images/story/counter-photo-card.webp'
export const COUNTER_CARD_SRCSET =
  '/images/story/counter-photo-card-480.webp 480w, /images/story/counter-photo-card-680.webp 680w, /images/story/counter-photo-card-960.webp 960w, /images/story/counter-photo-card.webp 1280w'
// max-w-2xl: 672px from md; sm container minus px-4: 608px; below sm: viewport minus px-4.
export const COUNTER_CARD_SIZES =
  '(min-width: 768px) 672px, (min-width: 640px) 608px, calc(100vw - 2rem)'

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
  const t = useTranslations('home.story')

  return (
    <div data-testid="story-static">
      <Section tone="none" spacing="hero" className={cn('overflow-hidden', styles.woodCounterLight)}>
        <div className="mx-auto max-w-2xl text-center">
          {/* h1 here too: on mobile and reduced-motion renders this variant is
              the only visible one, and a page without a visible h1 loses its
              primary landmark (the pinned copy is display:none there) */}
          <CopyAct1 headingLevel={1} tone="onLight" />
        </div>
        {/* the counter photo is lazy for desktop; same srcset and sizes as the
            pinned fallback give mobile one shared download. webp only,
            deliberately: an avif source here would fork the formats and
            double-fetch the card */}
        <div className="mx-auto mt-10 max-w-2xl">
          <picture>
            <img
              src={COUNTER_CARD_SRC}
              srcSet={COUNTER_CARD_SRCSET}
              sizes={COUNTER_CARD_SIZES}
              alt={t('static.alt')}
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
        {/* the sync arcs point at the register — without the tablet the
            cloud syncs with nothing (the pinned variant keeps its persistent
            tablet on stage here; this variant has to bring its own) */}
        <StageStrip className="h-[300px] sm:h-[400px]">
          <div className="flex flex-col items-center">
            <CloudSync light />
            <DeviceTablet className="-mt-9 h-[210px] w-[304px]" />
          </div>
        </StageStrip>
      </Section>
    </div>
  )
}
