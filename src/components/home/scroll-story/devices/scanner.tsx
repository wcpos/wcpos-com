import { cn } from '@/lib/utils'
import { HardwareImage } from './hardware-image'

/**
 * Barcode scanners, photoreal renders (see
 * docs/runbooks/scroll-story-asset-generation.md, Act 3 prompt pack).
 * Three recognizable form factors, logo-free by design:
 *   1 black gun scanner upright in its weighted stand
 *   2 omnidirectional dome scanner on a round base
 *   3 white 2D scanner in a matching cradle
 */
const BOX = { width: 120, height: 190 } as const

const MODELS: Record<1 | 2 | 3, { name: string; width: number; height: number }> = {
  1: { name: 'scanner-1', width: 530, height: 800 },
  2: { name: 'scanner-2', width: 690, height: 800 },
  3: { name: 'scanner-3', width: 492, height: 800 },
}

export function DeviceScanner({
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
