'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'
import { trackClientEvent } from '@/lib/analytics/client-events'

type NextLinkProps = ComponentProps<typeof Link>

interface TrackedNextLinkProps extends NextLinkProps {
  eventName: string
  eventProperties?: Record<string, unknown>
}

export function TrackedNextLink({
  eventName,
  eventProperties,
  onClick,
  ...linkProps
}: TrackedNextLinkProps) {
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
