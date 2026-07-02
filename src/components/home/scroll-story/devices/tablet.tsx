import { cn } from '@/lib/utils'
import { PosScreen } from './pos-screen'
import styles from '../story.module.css'

/**
 * The story's protagonist: one persistent element from the top-down counter
 * shot through to the cloud act. The bezel is a CSS stand-in for the future
 * hyper-real render; the screen is always the live DOM PosScreen.
 */
export function DeviceTablet({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'h-[318px] w-[460px] rounded-[18px] p-3',
        styles.tabletBezel,
        className
      )}
    >
      <PosScreen variant="tablet" />
    </div>
  )
}
