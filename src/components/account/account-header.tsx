import { createHash } from 'crypto'
import Link from 'next/link'
import type { MedusaCustomer } from '@/lib/medusa-auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getConnectedAvatarUrlFromMetadata } from '@/lib/avatar'

interface AccountHeaderProps {
  customer: MedusaCustomer
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function getAvatarUrl(customer: MedusaCustomer): string {
  const metadata = isRecord(customer.metadata) ? customer.metadata : {}
  const accountProfile = isRecord(metadata.account_profile)
    ? metadata.account_profile
    : {}

  const customDataUrl = asString(accountProfile.avatarDataUrl)
  if (customDataUrl) return customDataUrl

  const customUrl = asString(accountProfile.avatarUrl)
  if (customUrl) return customUrl

  const oauthAvatarUrl = getConnectedAvatarUrlFromMetadata(metadata)
  if (oauthAvatarUrl) return oauthAvatarUrl

  const hash = createHash('md5')
    .update(customer.email.trim().toLowerCase())
    .digest('hex')
  return `https://www.gravatar.com/avatar/${hash}?d=mp`
}

function getInitials(customer: MedusaCustomer): string {
  const first = customer.first_name?.trim().charAt(0) ?? ''
  const last = customer.last_name?.trim().charAt(0) ?? ''
  if (first || last) {
    return `${first}${last}`.toUpperCase()
  }
  return customer.email.trim().charAt(0).toUpperCase() || 'U'
}

export function AccountHeader({ customer }: AccountHeaderProps) {
  const avatarUrl = getAvatarUrl(customer)
  const initials = getInitials(customer)

  return (
    <header className="border-b bg-white">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-xl font-bold text-gray-900">
            WCPOS
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600">Account</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl} alt={customer.email} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-gray-600">{customer.email}</span>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-900">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
