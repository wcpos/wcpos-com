'use client'

import type { ComponentProps } from 'react'
import { Link } from '@/i18n/navigation'
import { trackClientEvent } from '@/lib/analytics/client-events'

type LocaleLinkProps = ComponentProps<typeof Link>

interface TrackedLocaleLinkProps extends LocaleLinkProps {
  eventName: string
  eventProperties?: Record<string, unknown>
}

export function TrackedLocaleLink({
  eventName,
  eventProperties,
  onClick,
  ...linkProps
}: TrackedLocaleLinkProps) {
  return (
    <Link
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
