import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * IconTile — a fixed square/round chip that centres an icon. Collapses the
 * ~15 hand-rolled `flex h-N w-N items-center justify-center rounded-*` wrappers
 * that drifted across size (8/9/10/12), radius (md/lg/xl/full) and tint
 * (muted vs wcpos-red/10 vs rose-50). Owns the icon size so callers don't.
 *
 * Decorative by default (`aria-hidden`): the icon repeats adjacent text. Pass
 * `aria-hidden={false}` and a label if a tile must be announced.
 */
const iconTileVariants = cva(
  'inline-flex shrink-0 items-center justify-center',
  {
    variants: {
      size: {
        sm: 'h-8 w-8 [&_svg]:size-4',
        md: 'h-9 w-9 [&_svg]:size-[18px]',
        lg: 'h-12 w-12 [&_svg]:size-6',
      },
      shape: {
        square: 'rounded-md',
        round: 'rounded-full',
      },
      tone: {
        muted: 'bg-muted text-muted-foreground',
        brand: 'bg-wcpos-red/10 text-wcpos-red-accent',
        caution:
          'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
      },
    },
    defaultVariants: { size: 'md', shape: 'square', tone: 'muted' },
  },
)

export interface IconTileProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof iconTileVariants> {}

function IconTile({
  className,
  size,
  shape,
  tone,
  children,
  ...props
}: IconTileProps) {
  return (
    <span
      className={cn(iconTileVariants({ size, shape, tone }), className)}
      aria-hidden="true"
      {...props}
    >
      {children}
    </span>
  )
}

export { IconTile, iconTileVariants }
