import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Section — the canonical full-bleed band for marketing-style pages.
 *
 * `tone` controls the background and (for `dark`) the default text colour.
 * `spacing` standardises the vertical rhythm that home sections previously
 * hand-rolled (py-16/20/24 drift). Inner content is wrapped in <Container>.
 */
const sectionVariants = cva('', {
  variants: {
    tone: {
      default: 'bg-white dark:bg-slate-950',
      muted: 'bg-slate-50 dark:bg-slate-900/50',
      dark: 'bg-slate-900 text-white',
      none: '',
    },
    spacing: {
      none: '',
      compact: 'py-16 md:py-20',
      default: 'py-16 md:py-24',
      hero: 'py-20 md:py-24 lg:py-28',
    },
  },
  defaultVariants: {
    tone: 'default',
    spacing: 'default',
  },
})

export interface SectionProps
  extends
    React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof sectionVariants> {
  /** Render the band without an inner Container (caller supplies layout). */
  bare?: boolean
  containerClassName?: string
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  (
    { className, containerClassName, tone, spacing, bare, children, ...props },
    ref,
  ) => (
    <section
      ref={ref}
      className={cn(sectionVariants({ tone, spacing }), className)}
      {...props}
    >
      {bare ? (
        children
      ) : (
        <Container className={containerClassName}>{children}</Container>
      )}
    </section>
  ),
)
Section.displayName = 'Section'

/**
 * Container — horizontal gutter + max-width wrapper. `width` narrows the
 * content column for reading-width pages (roadmap, legal, account body);
 * the default uses the Tailwind `container` for full marketing width.
 */
const containerVariants = cva('mx-auto px-4', {
  variants: {
    width: {
      default: 'container',
      prose: 'w-full max-w-3xl',
      content: 'w-full max-w-5xl',
      wide: 'w-full max-w-7xl',
      // Narrower reading/form columns the callers previously reached for as raw
      // `max-w-*` (11× max-w-2xl, 6× max-w-md, 5× max-w-sm).
      narrow: 'w-full max-w-2xl',
      form: 'w-full max-w-md',
      sm: 'w-full max-w-sm',
    },
  },
  defaultVariants: {
    width: 'default',
  },
})

export interface ContainerProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, width, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(containerVariants({ width }), className)}
      {...props}
    />
  ),
)
Container.displayName = 'Container'

export { Section, Container, sectionVariants, containerVariants }
