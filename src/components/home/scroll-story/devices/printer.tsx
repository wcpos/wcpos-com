import { cn } from '@/lib/utils'
import { HardwareImage } from './hardware-image'

/**
 * Thermal receipt printers, photoreal renders (see
 * docs/runbooks/scroll-story-asset-generation.md, Act 3 prompt pack).
 * Three recognizable form factors, logo-free by design:
 *   1 light-gray cube, receipt curling out the front
 *   2 black tower, receipt from the top hatch
 *   3 minimalist white cube, front exit slit
 * Receipts and status LEDs are baked into the renders.
 */
const BOX = { width: 210, height: 148 } as const

const MODELS: Record<1 | 2 | 3, { name: string; width: number; height: number }> = {
  1: { name: 'printer-1', width: 800, height: 681 },
  2: { name: 'printer-2', width: 763, height: 800 },
  3: { name: 'printer-3', width: 800, height: 676 },
}

export function DevicePrinter({
  className,
  model = 1,
}: {
  className?: string
  model?: 1 | 2 | 3
}) {
  const spec = MODELS[model]
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
      />
    </div>
  )
}
