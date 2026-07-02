import { cn } from '@/lib/utils'
import { PosScreen } from './pos-screen'
import styles from '../story.module.css'

export function DevicePhone({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'h-[258px] w-[128px] rounded-[22px] p-2',
        styles.phoneBezel,
        className
      )}
    >
      <PosScreen variant="phone" />
    </div>
  )
}
