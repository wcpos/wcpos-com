'use client'

import Link from 'next/link'
import { forwardRef, type ComponentProps } from 'react'
import { trackClientEvent } from '@/lib/analytics/client-events'

type NextLinkProps = ComponentProps<typeof Link>

interface TrackedNextLinkProps extends NextLinkProps {
  eventName: string
  eventProperties?: Record<string, unknown>
}

export const TrackedNextLink = forwardRef<HTMLAnchorElement, TrackedNextLinkProps>(
  function TrackedNextLink(
    { eventName, eventProperties, onClick, ...linkProps },
    ref
  ) {
    return (
      <Link
        ref={ref}
        {...linkProps}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) {
            trackClientEvent(eventName, eventProperties)
          }
        }}
      />
    )
  }
)
