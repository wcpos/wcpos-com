import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * TextLink — the inline brand link affordance. Converges the split between
 * `text-wcpos-red` and `text-wcpos-red-accent` (and a bespoke ecosystem focus
 * ring) onto one definition in the accessible accent red.
 *
 * Renders an <a> by default; pass `asChild` to wrap a routing link
 * (`<TextLink asChild><Link href=…>…</Link></TextLink>`). The exported
 * `textLinkClassName` is available for the rare spot that styles a link inline.
 */
const textLinkClassName =
  'font-medium text-wcpos-red-accent underline-offset-4 hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

export interface TextLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  asChild?: boolean
  /** Append a trailing arrow (renders the link as inline-flex). */
  arrow?: boolean
}

const TextLink = React.forwardRef<HTMLAnchorElement, TextLinkProps>(
  ({ className, asChild = false, arrow = false, children, ...props }, ref) => {
    // `asChild` routes through Radix Slot, which requires a SINGLE child — so it
    // renders the caller's element verbatim (no trailing arrow). The arrow only
    // applies to the default <a> render.
    if (asChild) {
      return (
        <Slot ref={ref} className={cn(textLinkClassName, className)} {...props}>
          {children}
        </Slot>
      )
    }
    return (
      <a
        ref={ref}
        className={cn(
          textLinkClassName,
          arrow && 'inline-flex items-center gap-1',
          className,
        )}
        {...props}
      >
        {children}
        {arrow && (
          <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
        )}
      </a>
    )
  },
)
TextLink.displayName = 'TextLink'

export { TextLink, textLinkClassName }
