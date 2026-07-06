'use client'

import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { trackClientEvent } from '@/lib/analytics/client-events'

interface TrackedExternalLinkProps extends ComponentPropsWithoutRef<'a'> {
  eventName: string
  eventProperties?: Record<string, unknown>
}

/**
 * A plain external `<a>` that fires a PostHog event on click. Mirrors
 * TrackedLocaleLink, but for outbound links (wordpress.org, github, etc.) that
 * can't go through the i18n <Link>. Consent is enforced downstream in
 * trackClientEvent, so callers just declare the event.
 */
export const TrackedExternalLink = forwardRef<
  HTMLAnchorElement,
  TrackedExternalLinkProps
>(function TrackedExternalLink(
  { eventName, eventProperties, onClick, ...anchorProps },
  ref
) {
  return (
    <a
      ref={ref}
      {...anchorProps}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          trackClientEvent(eventName, eventProperties)
        }
      }}
    />
  )
})
