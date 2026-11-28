import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The shell's one "current" treatment: the active nav item, the current
 * phone-menu row, the current language and the selected theme segment.
 * Dark lifts the tint one step so it reads at least as strong as the
 * bg-muted hover fill beside it.
 */
export const currentItemClass =
  'bg-primary/10 text-wcpos-red-accent dark:bg-primary/15'

/**
 * The shell's one "leaves wcpos.com" mark: a 12px arrow in muted ink, 3px
 * after the label, set 1px below the baseline so it centres on the x-height.
 */
export function ExternalMark({ className }: { className?: string }) {
  return (
    <ArrowUpRight
      aria-hidden="true"
      strokeWidth={2.25}
      className={cn(
        'ml-[3px] inline-block size-3 shrink-0 align-[-1px] text-muted-foreground',
        className
      )}
    />
  )
}
