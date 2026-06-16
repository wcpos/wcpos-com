import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * SectionHeading — the eyebrow / title / subtitle block that home sections
 * previously copy-pasted with divergent weights, sizes and colours.
 *
 * `tone="inverse"` is for dark bands (Section tone="dark"); `align` controls
 * text alignment and auto-centres the subtitle when centred.
 */
const titleVariants = cva('font-semibold tracking-tight', {
  variants: {
    tone: {
      default: 'text-slate-800 dark:text-slate-100',
      inverse: 'text-white',
    },
    size: {
      // Section h2 — the home default.
      default: 'text-2xl md:text-3xl',
      // Page/hero h1.
      hero: 'text-4xl font-bold leading-tight md:text-5xl',
    },
  },
  defaultVariants: { tone: 'default', size: 'default' },
})

export interface SectionHeadingProps
  extends
    Omit<React.HTMLAttributes<HTMLDivElement>, 'title'>,
    VariantProps<typeof titleVariants> {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  align?: 'left' | 'center'
  /** Heading level for the title element (default h2). */
  as?: 'h1' | 'h2' | 'h3'
}

function SectionHeading({
  className,
  eyebrow,
  title,
  subtitle,
  tone,
  size,
  align = 'center',
  as: TitleTag = 'h2',
  ...props
}: SectionHeadingProps) {
  const centered = align === 'center'
  return (
    <div
      className={cn(
        'space-y-3',
        centered ? 'text-center' : 'text-left',
        className,
      )}
      {...props}
    >
      {eyebrow && (
        <p
          className={cn(
            'text-sm font-semibold uppercase tracking-wider',
            tone === 'inverse'
              ? 'text-wcpos-red-accent'
              : 'text-wcpos-red dark:text-wcpos-red-accent',
          )}
        >
          {eyebrow}
        </p>
      )}
      <TitleTag className={titleVariants({ tone, size })}>{title}</TitleTag>
      {subtitle && (
        <p
          className={cn(
            'text-lg',
            tone === 'inverse'
              ? 'text-slate-300'
              : 'text-slate-600 dark:text-slate-400',
            centered && 'mx-auto max-w-2xl',
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}

export { SectionHeading, titleVariants }
