import 'server-only'

import { createHash } from 'crypto'
import { getConnectedAvatarUrlFromMetadata } from '@/lib/avatar'
import { getCustomProfileAvatar } from '@/lib/customer-profile-metadata'

/**
 * Server-only avatar/initials derivation for a customer. Kept out of
 * `lib/avatar.ts` because that module is also imported by client components
 * and must stay free of the `crypto` (gravatar) dependency.
 */
interface AvatarCustomer {
  email: string
  first_name?: string
  last_name?: string
  metadata?: Record<string, unknown>
}

export function getCustomerAvatarUrl(customer: AvatarCustomer): string {
  const metadata = customer.metadata
  const customAvatar = getCustomProfileAvatar(metadata)

  const customDataUrl = customAvatar.avatarDataUrl
  if (customDataUrl) return customDataUrl

  const customUrl = customAvatar.avatarUrl
  if (customUrl) return customUrl

  const oauthAvatarUrl = getConnectedAvatarUrlFromMetadata(metadata)
  if (oauthAvatarUrl) return oauthAvatarUrl

  const hash = createHash('md5')
    .update(customer.email.trim().toLowerCase())
    .digest('hex')
  return `https://www.gravatar.com/avatar/${hash}?d=mp`
}

export function getCustomerInitials(customer: AvatarCustomer): string {
  const first = customer.first_name?.trim().charAt(0) ?? ''
  const last = customer.last_name?.trim().charAt(0) ?? ''
  if (first || last) {
    return `${first}${last}`.toUpperCase()
  }
  return customer.email.trim().charAt(0).toUpperCase() || 'U'
}
