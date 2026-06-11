import { createHash } from 'crypto'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
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
  const t = useTranslations('account.header')
  const avatarUrl = getAvatarUrl(customer)
  const initials = getInitials(customer)

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex shrink-0 items-baseline gap-2 sm:gap-3">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight transition-opacity hover:opacity-80"
          >
            WCPOS
          </Link>
          <span aria-hidden="true" className="select-none text-border">
            /
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            {t('breadcrumb')}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar className="h-8 w-8 shrink-0 ring-2 ring-border">
              <AvatarImage src={avatarUrl} alt={customer.email} />
              <AvatarFallback className="text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {/* The email can be arbitrarily long — hide it on phones and
                truncate it on wider screens so the header never overflows. */}
            <span className="hidden min-w-0 max-w-[14rem] truncate text-sm text-muted-foreground sm:block">
              {customer.email}
            </span>
          </div>
          <form action="/api/auth/logout" method="POST" className="shrink-0">
            <button
              type="submit"
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t('signOut')}
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
