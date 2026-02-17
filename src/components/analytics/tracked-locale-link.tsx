'use client'

import { forwardRef, type ComponentProps } from 'react'
import { Link } from '@/i18n/navigation'
import { trackClientEvent } from '@/lib/analytics/client-events'

type LocaleLinkProps = ComponentProps<typeof Link>

interface TrackedLocaleLinkProps extends LocaleLinkProps {
  eventName: string
  eventProperties?: Record<string, unknown>
}

export const TrackedLocaleLink = forwardRef<
  HTMLAnchorElement,
  TrackedLocaleLinkProps
>(
  function TrackedLocaleLink(
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
