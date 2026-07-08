import { useLocale, useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { HardwareImage, type ScreenRect } from './hardware-image'
import { formatUsdDemoAmount } from './pos-screen'

/**
 * Card payment terminals, photoreal renders (see
 * docs/runbooks/scroll-story-asset-generation.md, Act 3 prompt pack).
 * Three recognizable form factors, logo-free by design:
 *   1 classic countertop terminal (keypad + small screen)
 *   2 slim white smart terminal (full portrait touchscreen)
 *   3 square contactless reader on its dock (no screen)
 * Models with a screen get the live tap-to-pay overlay; rects are measured
 * in source-image px off the renders.
 */
const BOX = { width: 150, height: 224 } as const

const MODELS: Record<
  1 | 2 | 3,
  {
    name: string
    width: number
    height: number
    screen?: ScreenRect
    screenSize?: 'sm' | 'lg'
  }
> = {
  1: {
    name: 'terminal-1',
    width: 567,
    height: 800,
    screen: { left: 78, top: 165, width: 265, height: 148 },
    screenSize: 'sm',
  },
  2: {
    name: 'terminal-2',
    width: 493,
    height: 800,
    screen: { left: 43, top: 93, width: 299, height: 665 },
    screenSize: 'lg',
  },
  3: { name: 'terminal-3', width: 800, height: 629 },
}

export function DeviceTerminal({
  className,
  model = 1,
}: {
  className?: string
  model?: 1 | 2 | 3
}) {
  const spec = MODELS[model]
  const t = useTranslations('home.story.terminal')
  const locale = useLocale()
  const amount = formatUsdDemoAmount(locale, 69, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return (
    <div
      aria-hidden="true"
      className={cn('flex items-end justify-center', className)}
      style={{ width: BOX.width, height: BOX.height }}
    >
      <HardwareImage
        name={spec.name}
        width={spec.width}
        height={spec.height}
        boxWidth={BOX.width}
        boxHeight={BOX.height}
        screen={spec.screen}
      >
        <span
          className={cn(
            'font-bold text-white',
            spec.screenSize === 'lg' ? 'text-2xl' : 'text-[13px] leading-tight'
          )}
        >
          {amount}
        </span>
        <span
          className={cn(
            'uppercase tracking-widest text-cyan-200',
            spec.screenSize === 'lg' ? 'mt-1 text-[10px]' : 'text-[6px]'
          )}
        >
          {t('tapToPay')}
        </span>
      </HardwareImage>
    </div>
  )
}
