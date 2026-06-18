import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Eyebrow — the small uppercase overline above a heading (brand register) or a
 * muted micro-label above a field (muted register). One definition for the
 * `uppercase tracking-wider` overlines that SectionHeading and several pages
 * repeated by hand. SectionHeading renders its eyebrow through this.
 *
 * Note: this is the OVERLINE/label register only. Inline tinted pills with a
 * background (Latest / Beta / Free·GPL) are Badge tint-pills, not Eyebrows.
 */
const eyebrowVariants = cva('font-semibold uppercase tracking-wider', {
  variants: {
    tone: {
      brand: 'text-wcpos-red dark:text-wcpos-red-accent',
      muted: 'text-muted-foreground',
      inverse: 'text-wcpos-red-accent',
    },
    size: {
      default: 'text-sm',
      sm: 'text-xs',
    },
  },
  defaultVariants: { tone: 'brand', size: 'default' },
})

export interface EyebrowProps
  extends
    React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof eyebrowVariants> {
  as?: 'p' | 'h2' | 'div' | 'span'
}

function Eyebrow({
  className,
  tone,
  size,
  as: Tag = 'p',
  ...props
}: EyebrowProps) {
  return (
    <Tag className={cn(eyebrowVariants({ tone, size }), className)} {...props} />
  )
}

export { Eyebrow, eyebrowVariants }
