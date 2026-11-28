'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { DividedList, Row } from '@/components/ui/row'
import { StatusBadge } from '@/components/ui/status-badge'
import { TextLink } from '@/components/ui/text-link'
import { AccountNotice } from '@/components/account/account-notice'
import {
  ArrowRight,
  CalendarClock,
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  EyeOff,
  Key,
  Trash2,
} from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { formatDateForLocale } from '@/lib/date-format'
import { cn } from '@/lib/utils'
import {
  localizeRedirectPath,
  navigateAfterAuthChange,
} from '@/lib/safe-redirect'
import type { CanonicalLicenseStatus } from '@/lib/license-status'
import { getLicenseDisplayStatus, isLicenseExpiringSoon } from '@/lib/license'
import { getPlanByPolicyId, YEARLY_PRO_HANDLE } from '@/lib/plans'
import { presentLicenseStatus } from '@/lib/license-status-presentation'

interface Machine {
  id: string
  fingerprint: string
  name: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

/** Read a non-empty string field from a machine's Keygen metadata blob. */
function metaString(
  metadata: Record<string, unknown>,
  key: string
): string | undefined {
  const value = metadata?.[key]
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

interface License {
  id: string
  key: string
  status: CanonicalLicenseStatus
  expiry: string | null
  maxMachines: number
  // Authoritative activation count (from Keygen validate-key). Render the
  // "X of Y" count from this — `machines` (the detail list) can be empty when
  // machine management is unauthenticated, even with activations present.
  activationCount: number
  machines: Machine[]
  metadata: Record<string, unknown>
  policyId: string
  createdAt: string
}

interface DiscordMember {
  id: string
  discordUserId: string
  handle: string
  avatarUrl: string | null
  connectedAt: string
}

/**
 * A Discord user a holder removed from this licence: block-listed from
 * reclaiming a seat with the same key until the holder allows it again
 * (ADR-0007 removal semantics).
 */
interface BlockedDiscordMember {
  discordUserId: string
  handle: string
  avatarUrl: string | null
}

interface DiscordAccess {
  licenseId: string
  seatCap: number
  usedSeats: number
  members: DiscordMember[]
  blockedMembers: BlockedDiscordMember[]
}

const DISCORD_DEFAULT_CAP = 5

/**
 * Claim outcomes the Discord OAuth callback reports back via the `?discord=`
 * query param (see /api/discord/callback statusToQuery). Anything outside this
 * set is ignored rather than rendered, so a crafted URL can't inject copy.
 */
const DISCORD_CLAIM_STATUSES = [
  'claimed',
  'seat_cap_reached',
  'blocked',
  'license_not_active',
  'error',
] as const

type DiscordClaimStatus = (typeof DISCORD_CLAIM_STATUSES)[number]

function parseDiscordClaimStatus(value: string | null): DiscordClaimStatus | null {
  return DISCORD_CLAIM_STATUSES.includes(value as DiscordClaimStatus)
    ? (value as DiscordClaimStatus)
    : null
}

type LicenseActionErrorCode = 'read_only_inspection'

function isLicenseActionErrorCode(value: unknown): value is LicenseActionErrorCode {
  return value === 'read_only_inspection'
}

function emptyDiscordAccess(licenseId: string): DiscordAccess {
  return {
    licenseId,
    seatCap: DISCORD_DEFAULT_CAP,
    usedSeats: 0,
    members: [],
    blockedMembers: [],
  }
}

/**
 * Which card (if any) carries the "connect Discord for priority support"
 * prompt. The prompt's promise is account-level, so it appears on exactly ONE
 * card — the first active licence with a free seat — and on none once any
 * ACTIVE licence already has a member. Members on expired / suspended /
 * revoked / unverifiable licences don't count: the Pro role is evaluated per
 * active licence, so those members no longer hold it and the holder still
 * needs to connect through a live licence. Shared by the initial open-set
 * (so the prompt card opens by default even when it isn't first) and render.
 */
function findDiscordPromptLicenseId(
  licenses: License[],
  accessByLicense: Record<string, DiscordAccess>,
  now: number
): string | null {
  const isActive = (license: License) =>
    getLicenseDisplayStatus(license, now) === 'active'
  const accessFor = (license: License) =>
    accessByLicense[license.id] ?? emptyDiscordAccess(license.id)
  const anyActiveConnected = licenses.some(
    (license) => isActive(license) && accessFor(license).members.length > 0
  )
  if (anyActiveConnected) return null
  const target = licenses.find((license) => {
    const access = accessFor(license)
    return isActive(license) && access.usedSeats < access.seatCap
  })
  return target?.id ?? null
}

function memberInitials(handle: string): string {
  const cleaned = handle.replace(/^@/, '').trim()
  if (!cleaned) return 'DC'
  return cleaned.slice(0, 2).toUpperCase()
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Support-runway meter: fraction of a full yearly term still ahead. Purely
 * presentational (the meter under "Updates & priority support"); entitlement
 * decisions never read this.
 */
function supportRunwayPercent(expiryMs: number, nowMs: number): number {
  const remaining = expiryMs - nowMs
  if (remaining <= 0) return 0
  return Math.min(100, (remaining / (365 * DAY_MS)) * 100)
}

function daysUntil(expiryMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((expiryMs - nowMs) / DAY_MS))
}

/**
 * A machine that phoned home recently gets a green presence dot; anything
 * older (or without a lastSeenAt yet) stays neutral. Decorative only — the
 * dot is aria-hidden and no behaviour hangs off it.
 */
const RECENTLY_SEEN_MS = 48 * 60 * 60 * 1000

function isRecentlySeen(lastSeen: string | undefined, nowMs: number): boolean {
  if (!lastSeen) return false
  const seenMs = Date.parse(lastSeen)
  if (Number.isNaN(seenMs)) return false
  return nowMs - seenMs <= RECENTLY_SEEN_MS
}

/** One column of the Sites | Discord support | Downloads band. */
const COLUMN_CLASS =
  'flex min-w-0 flex-col border-t px-6 py-5 first:border-t-0 @max-[480px]:px-[18px] @max-[480px]:py-4 @min-[760px]:border-t-0 @min-[760px]:border-l @min-[760px]:first:border-l-0'

const COLUMN_GRID: Record<number, string> = {
  1: '',
  2: '@min-[760px]:grid-cols-2',
  3: '@min-[760px]:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.9fr)]',
}

function ColumnHeading({
  title,
  meta,
}: {
  title: string
  meta?: string
}) {
  return (
    <h3 className="flex items-baseline justify-between gap-2 text-sm font-semibold">
      {title}
      {meta && (
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {meta}
        </span>
      )}
    </h3>
  )
}

interface LicensesClientProps {
  initialLicenses: License[]
  /**
   * Per-licence covered version (ADR-0006). Keyed by license id: the newest
   * release that licence is entitled to on its own, or null when none. Computed
   * server-side in the page so release dates never re-ship to the client.
   */
  entitledVersions?: Record<string, string | null>
  discordAccessByLicense?: Record<string, DiscordAccess>
  /**
   * True when an admin is inspecting this account read-only. The account
   * mutation routes fence themselves with assertViewOnly(), but the Discord
   * claim CTA posts to the public /api/discord/claim route (outside
   * /api/account), which never sees the account-request header — so the gate
   * has to happen here, or an admin could bind their own Discord to the
   * inspected customer's licence.
   */
  viewOnly?: boolean
}

export function LicensesClient({
  initialLicenses,
  entitledVersions = {},
  discordAccessByLicense = {},
  viewOnly = false,
}: LicensesClientProps) {
  const locale = useLocale()
  const t = useTranslations('account.licenses')
  const tCommon = useTranslations('common')
  const tStatus = useTranslations('account.licenseStatus')
  const tDownloads = useTranslations('account.downloads')
  const [licenses, setLicenses] = useState<License[]>(initialLicenses)
  // License keys render masked; clicking a key reveals its full value for
  // that card only. Tracked per licence id so revealing one leaves the rest
  // masked.
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(() => new Set())
  // Licence id whose key was just copied, so its button can flash a
  // "Copied" confirmation. Cleared after a short delay.
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deactivating, setDeactivating] = useState<string | null>(null)
  const [confirmingDeactivate, setConfirmingDeactivate] = useState<string | null>(null)
  const [removingDiscordMember, setRemovingDiscordMember] = useState<string | null>(null)
  const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null)
  const [unblockingDiscordUser, setUnblockingDiscordUser] = useState<string | null>(null)
  // Captured once per mount so render stays pure for the React compiler.
  const [now] = useState(() => Date.now())
  // With several licences the page opens scannable: the first card starts
  // expanded, and so does any card that needs attention (not plain-active,
  // expiring soon, or carrying the Discord support prompt). The rest collapse
  // to their key band until clicked.
  // Uses the SAME `now` capture as the status presentation so the initial
  // open set and the rendered statuses can never disagree.
  const [openLicenses, setOpenLicenses] = useState<Set<string>>(() => {
    const promptLicenseId = findDiscordPromptLicenseId(
      initialLicenses,
      discordAccessByLicense,
      now
    )
    return new Set(
      initialLicenses
        .filter(
          (license, index) =>
            index === 0 ||
            license.id === promptLicenseId ||
            getLicenseDisplayStatus(license, now) !== 'active' ||
            isLicenseExpiringSoon(license, now)
        )
        .map((license) => license.id)
    )
  })

  // Claim outcome handed back by the Discord OAuth callback redirect. Captured
  // once on mount, then scrubbed from the address bar so a reload (or a copied
  // link) doesn't replay a stale banner.
  const searchParams = useSearchParams()
  const [discordClaimStatus, setDiscordClaimStatus] = useState<DiscordClaimStatus | null>(
    () => parseDiscordClaimStatus(searchParams.get('discord'))
  )
  useEffect(() => {
    if (!parseDiscordClaimStatus(new URL(window.location.href).searchParams.get('discord'))) {
      return
    }
    const url = new URL(window.location.href)
    url.searchParams.delete('discord')
    window.history.replaceState(null, '', url.toString())
  }, [])

  const [discordAccessByLicenseState, setDiscordAccessByLicenseState] = useState<
    Record<string, DiscordAccess>
  >(() =>
    Object.fromEntries(
      initialLicenses.map((license) => [
        license.id,
        discordAccessByLicense[license.id] ?? emptyDiscordAccess(license.id),
      ])
    )
  )

  const getLicenseActionErrorMessage = async (
    response: Response,
    fallback: string
  ) => {
    const payload = await response.json().catch(() => ({}))
    if (isLicenseActionErrorCode(payload.errorCode)) {
      return t('apiErrors.read_only_inspection')
    }
    return fallback
  }

  const fetchLicenses = async () => {
    setError(null)
    try {
      const res = await fetch('/api/account/licenses')
      if (!res.ok) {
        if (res.status === 401) {
          navigateAfterAuthChange('/login', locale)
          return
        }
        throw new Error(t('loadError'))
      }
      const data = await res.json()
      const nextLicenses = data.licenses || []
      setLicenses(nextLicenses)
      setDiscordAccessByLicenseState((prev) =>
        Object.fromEntries(
          nextLicenses.map((license: License) => [
            license.id,
            data.discordAccessByLicense?.[license.id] ??
              prev[license.id] ??
              emptyDiscordAccess(license.id),
          ])
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadError'))
    }
  }

  const handleDeactivate = async (licenseId: string, machineId: string) => {
    setDeactivating(machineId)
    try {
      const res = await fetch(`/api/account/licenses/${licenseId}/machines/${machineId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        throw new Error(await getLicenseActionErrorMessage(res, t('deactivateError')))
      }
      await fetchLicenses()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('deactivateError'))
    } finally {
      setDeactivating(null)
      setConfirmingDeactivate(null)
    }
  }


  const handleRemoveDiscordMember = async (licenseId: string, memberId: string) => {
    setRemovingDiscordMember(memberId)
    setError(null)
    try {
      const res = await fetch(
        `/api/account/licenses/${licenseId}/discord/members/${memberId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        if (res.status === 401) {
          navigateAfterAuthChange('/login', locale)
          return
        }
        throw new Error(await getLicenseActionErrorMessage(res, t('discordRemoveError')))
      }
      setDiscordAccessByLicenseState((accessByLicense) => {
        const current = accessByLicense[licenseId] ?? emptyDiscordAccess(licenseId)
        const removed = current.members.find((member) => member.id === memberId)
        const members = current.members.filter((member) => member.id !== memberId)
        // Holder removal block-lists the Discord user (ADR-0007), so the
        // person moves to the blocked list rather than vanishing — that is
        // where the holder finds the undo.
        const blockedMembers =
          removed &&
          !current.blockedMembers.some(
            (blocked) => blocked.discordUserId === removed.discordUserId
          )
            ? [
                ...current.blockedMembers,
                {
                  discordUserId: removed.discordUserId,
                  handle: removed.handle,
                  avatarUrl: removed.avatarUrl,
                },
              ]
            : current.blockedMembers
        return {
          ...accessByLicense,
          [licenseId]: { ...current, members, usedSeats: members.length, blockedMembers },
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('discordRemoveError'))
    } finally {
      setRemovingDiscordMember(null)
      setConfirmingRemove(null)
    }
  }

  const handleUnblockDiscordMember = async (licenseId: string, discordUserId: string) => {
    setUnblockingDiscordUser(discordUserId)
    setError(null)
    try {
      const res = await fetch(
        `/api/account/licenses/${licenseId}/discord/blocked/${encodeURIComponent(discordUserId)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        if (res.status === 401) {
          navigateAfterAuthChange('/login', locale)
          return
        }
        throw new Error(await getLicenseActionErrorMessage(res, t('discordUnblockError')))
      }
      // Unblocking only lifts the block — the person still reconnects through
      // the normal claim flow, so no member row appears until they do.
      setDiscordAccessByLicenseState((accessByLicense) => {
        const current = accessByLicense[licenseId] ?? emptyDiscordAccess(licenseId)
        return {
          ...accessByLicense,
          [licenseId]: {
            ...current,
            blockedMembers: current.blockedMembers.filter(
              (blocked) => blocked.discordUserId !== discordUserId
            ),
          },
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('discordUnblockError'))
    } finally {
      setUnblockingDiscordUser(null)
    }
  }

  const maskKey = (key: string) => {
    if (key.length <= 4) return '••••'
    return '••••-••••-' + key.slice(-4)
  }

  const toggleRevealKey = (licenseId: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(licenseId)) {
        next.delete(licenseId)
      } else {
        next.add(licenseId)
      }
      return next
    })
  }

  const toggleOpenLicense = (licenseId: string) => {
    setOpenLicenses((prev) => {
      const next = new Set(prev)
      if (next.has(licenseId)) {
        next.delete(licenseId)
      } else {
        next.add(licenseId)
      }
      return next
    })
  }

  const handleCopyKey = async (licenseId: string, key: string) => {
    try {
      await navigator.clipboard.writeText(key)
      setCopiedKey(licenseId)
      // Reset the confirmation, but only if this card is still the copied
      // one (guards against clobbering a later copy of a different card).
      setTimeout(() => {
        setCopiedKey((current) => (current === licenseId ? null : current))
      }, 2000)
    } catch {
      setError(t('copyError'))
    }
  }

  // Keygen can report status "active" after the expiry date has passed;
  // present those licenses as expired so the UI matches download entitlement.
  // (Shared rule: unparseable expiry fails closed, matching the server.)
  const getDisplayStatus = (license: License) =>
    getLicenseDisplayStatus(license, now)

  // The one card that carries the Discord support prompt (see the helper for
  // the selection rule). Recomputed from live state so removing the last
  // member, or a fresh claim, moves or clears the prompt without a reload.
  const discordPromptLicenseId = findDiscordPromptLicenseId(
    licenses,
    discordAccessByLicenseState,
    now
  )


  return (
    <>
      {discordClaimStatus && (
        <Alert
          tone={discordClaimStatus === 'claimed' ? 'positive' : 'critical'}
          role="status"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDiscordClaimStatus(null)}
              aria-label={tCommon('dismiss')}
            >
              {tCommon('dismiss')}
            </Button>
          }
        >
          {t(`discordClaimStatus.${discordClaimStatus}`)}
        </Alert>
      )}
      {error && (
        <Alert tone="critical" role="alert">
          {error}
        </Alert>
      )}

      {licenses.length === 0 ? (
        <Card>
          <EmptyState
            className="items-start p-5 text-left"
            icon={<Key />}
            title={t('emptyTitle')}
            description={t('emptyDescription')}
            action={
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/pro">{t('emptyCta')}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/downloads">
                    <Download />
                    {t('emptyFreeCta')}
                  </Link>
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        licenses.map((license) => {
          const displayStatus = getDisplayStatus(license)
          const expiringSoon = isLicenseExpiringSoon(license, now)
          // Inside the 30-day window an active licence reads "expiring"
          // (caution) — a display label only; entitlement is unchanged.
          const statusPresentation = presentLicenseStatus(displayStatus)
          const badgeTone = expiringSoon ? 'caution' : statusPresentation.tone
          const badgeLabel = expiringSoon
            ? tStatus('expiring')
            : tStatus(statusPresentation.labelKey)
          const plan = getPlanByPolicyId(license.policyId)
          const planLabel = plan ? t(plan.labelKey) : null
          const isLifetime = license.expiry == null
          // A licence is renewable when it has an expiry to extend; a lifetime
          // licence (null expiry) never renews. On payment the Medusa
          // order-completed subscriber extends the SAME licence using the
          // locked max(expiry, now) + 1yr rule.
          const isRenewable = license.expiry != null
          // Yearly renewable licences use the one-click renewal flow (prefilled
          // cart + saved card; falls back to the full checkout when billing
          // isn't on file). Any other renewable/expired licence keeps the plain
          // checkout deep-link.
          const renewHref =
            isRenewable && plan?.handle === YEARLY_PRO_HANDLE
              ? '/account/licenses/renew'
              : plan?.handle
                ? `/pro/checkout?product=${plan.handle}`
                : '/pro'
          // Always offer renewal on a renewable licence that is active or
          // expired, EXCEPT while the expiring-soon notice is already showing
          // its own Renew (avoids two identical CTAs on one card). Skip the
          // exceptional states (suspended/revoked/unknown) where a charge would
          // not restore access.
          const showRenew =
            isRenewable &&
            !expiringSoon &&
            (displayStatus === 'active' || displayStatus === 'expired')
          // Per-licence attributed version (ADR-0006): null when this licence
          // alone covers nothing.
          const coveredVersion = entitledVersions[license.id] ?? null
          const scopedDownloadsHref = `/account/downloads?license=${encodeURIComponent(
            license.id
          )}`
          const discordAccess =
            discordAccessByLicenseState[license.id] ?? emptyDiscordAccess(license.id)
          const discordMembers = discordAccess.members
          const hasFreeDiscordSeat =
            discordAccess.usedSeats < discordAccess.seatCap
          // The account-level "connect Discord for priority support" prompt
          // sits on ONE card only (see findDiscordPromptLicenseId).
          const promptDiscordConnect = license.id === discordPromptLicenseId
          const keyRevealed = revealedKeys.has(license.id)
          const keyCopied = copiedKey === license.id
          // Last-4 of the key distinguishes each card's controls in the
          // accessible name — with multiple licences the buttons would
          // otherwise all announce the same label to screen readers.
          const keySuffix = license.key.slice(-4)
          const isOpen = openLicenses.has(license.id)
          const detailId = `license-detail-${license.id}`
          const expiryMs = license.expiry ? Date.parse(license.expiry) : null
          const hasValidExpiry = expiryMs != null && !Number.isNaN(expiryMs)
          const expiryDate = hasValidExpiry
            ? formatDateForLocale(license.expiry as string, locale)
            : null
          const daysLeft = hasValidExpiry ? daysUntil(expiryMs as number, now) : 0
          const bold = (chunks: React.ReactNode) => (
            <b className="font-semibold">{chunks}</b>
          )

          // The plain-words phrase beside the badge (hidden on a phone, where
          // the status line right under the key says the same).
          const meaning =
            displayStatus === 'active'
              ? isLifetime
                ? t('meanLifetime')
                : expiringSoon
                  ? t('meanExpiring', { days: daysLeft })
                  : t('meanActive')
              : displayStatus === 'expired'
                ? t('meanExpired')
                : displayStatus === 'suspended'
                  ? t('meanSuspended')
                  : null

          // The status line: when updates and priority support end, then one
          // muted sentence explaining the state. Lifetime means NO expiry; an
          // expiry that fails to parse is NOT lifetime (the display status
          // already failed closed to expired), so it gets no date line.
          const statusLine =
            displayStatus === 'suspended'
              ? t('linePaused')
              : isLifetime
                ? t('factLifetime')
                : !expiryDate
                  ? null
                  : displayStatus === 'expired'
                    ? t('factEnded', { date: expiryDate })
                    : t('factUntil', { date: expiryDate })
          const statusSub =
            displayStatus === 'suspended'
              ? expiryDate
                ? t('pausedNote', { date: expiryDate })
                : null
              : displayStatus === 'expired'
                ? t('expiredKeepsRunning')
                : displayStatus === 'unknown'
                  ? t.rich('unverifiable', {
                      supportLink: (chunks) => (
                        <TextLink asChild>
                          <Link href="/support">{chunks}</Link>
                        </TextLink>
                      ),
                    })
                  : isLifetime
                    ? t('lifetimeNote')
                    : null

          // Read-only inspection: Renew is drawn disabled (the API refuses
          // account changes anyway) and says why.
          const renewControl = (label: string, variant: 'default' | 'outline', size: 'sm' | 'default') =>
            viewOnly ? (
              <Button variant={variant} size={size} disabled>
                {label}
              </Button>
            ) : (
              <Button asChild variant={variant} size={size}>
                <Link href={renewHref} prefetch={false}>
                  {label}
                </Link>
              </Button>
            )

          // A real form post: the 303 to Discord's authorize page (and the
          // OAuth round-trip back) must run as a top-level navigation, which
          // fetch() cannot do. One outline Connect per card, in its Discord
          // column. Read-only inspection draws it disabled and outside the
          // form: the public /api/discord/claim route can't be fenced by
          // assertViewOnly().
          const connectLabel =
            discordMembers.length > 0
              ? t('discordConnectAnother')
              : t('discordConnectCta')
          const connectDiscord = viewOnly ? (
            <Button variant="outline" size="sm" disabled>
              {connectLabel}
            </Button>
          ) : (
            <form method="POST" action="/api/discord/claim">
              <input type="hidden" name="licenseKey" value={license.key} />
              <input
                type="hidden"
                name="returnTo"
                value={localizeRedirectPath('/account/licenses', locale)}
              />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                aria-label={t('discordConnectCtaAria', { suffix: keySuffix })}
              >
                {connectLabel}
              </Button>
            </form>
          )

          const showDownloads =
            displayStatus === 'active' ||
            displayStatus === 'expired' ||
            displayStatus === 'suspended'
          const columnCount = showDownloads ? 3 : 2
          const freeSlots = Math.max(
            0,
            license.maxMachines - license.activationCount
          )

          return (
          <Card key={license.id} className="@container overflow-hidden">
            <div className="p-6 @max-[640px]:p-[18px]">
              <div className="flex flex-wrap items-center gap-2.5">
                <StatusBadge
                  tone={badgeTone}
                  title={
                    statusPresentation.titleKey
                      ? t(statusPresentation.titleKey)
                      : undefined
                  }
                >
                  {badgeLabel}
                </StatusBadge>
                <p className="text-[13px] font-medium text-muted-foreground @max-[480px]:whitespace-nowrap">
                  <b className="font-semibold">
                    WCPOS Pro{planLabel ? <> {planLabel}</> : null}
                  </b>
                  {meaning && (
                    <span className="@max-[480px]:hidden"> · {meaning}</span>
                  )}
                </p>
              </div>

              <div className="mt-1.5 flex items-center gap-2 @max-[480px]:flex-wrap">
                <code className="me-2 whitespace-nowrap font-mono text-[28px] font-medium leading-9 tracking-[0.02em] text-foreground @max-[640px]:text-[22px] @max-[640px]:leading-[30px] @max-[480px]:mb-1.5 @max-[480px]:basis-full @max-[480px]:break-all @max-[480px]:whitespace-normal">
                  {keyRevealed ? license.key : maskKey(license.key)}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleRevealKey(license.id)}
                  aria-pressed={keyRevealed}
                  aria-label={t(keyRevealed ? 'hideKeyAria' : 'showKeyAria', {
                    suffix: keySuffix,
                  })}
                >
                  {keyRevealed ? <EyeOff /> : <Eye />}
                  {t(keyRevealed ? 'hideKey' : 'showKey')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyKey(license.id, license.key)}
                  aria-label={
                    keyCopied
                      ? t('copiedKey')
                      : t('copyKeyAria', { suffix: keySuffix })
                  }
                >
                  {keyCopied ? <Check className="text-green-600" /> : <Copy />}
                  {keyCopied ? t('copiedKey') : t('copyKey')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ms-auto"
                  onClick={() => toggleOpenLicense(license.id)}
                  aria-expanded={isOpen}
                  // The detail node is unmounted while collapsed, so only
                  // reference it when it exists.
                  aria-controls={isOpen ? detailId : undefined}
                  aria-label={t(isOpen ? 'collapseAria' : 'expandAria', {
                    suffix: keySuffix,
                  })}
                >
                  {t(isOpen ? 'hideDetails' : 'showDetails')}
                  <ChevronDown
                    className={cn('transition-transform', isOpen && 'rotate-180')}
                  />
                </Button>
              </div>

              <div className="mt-3.5 max-w-[64ch]">
                {statusLine && (
                  <p
                    className={cn(
                      'font-semibold tabular-nums',
                      isOpen ? 'text-base' : 'text-sm'
                    )}
                  >
                    {statusLine}
                    {isOpen && displayStatus === 'active' && !isLifetime && hasValidExpiry && (
                      <span className="text-sm font-normal text-muted-foreground">
                        {' · '}
                        {t('daysLeft', { days: daysLeft })}
                      </span>
                    )}
                    {!isOpen && (
                      <span className="text-sm font-normal text-muted-foreground">
                        {' · '}
                        {t('bandSites', {
                          count: license.activationCount,
                          max: license.maxMachines,
                        })}
                      </span>
                    )}
                  </p>
                )}
                {isOpen && statusSub && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {statusSub}
                  </p>
                )}
                {isOpen && hasValidExpiry && displayStatus === 'active' && (
                  <Progress
                    tone="positive"
                    value={supportRunwayPercent(expiryMs as number, now)}
                    className="mt-2.5 max-w-[360px]"
                  />
                )}
                {isOpen && showRenew && (
                  <div className="mt-3.5 flex flex-col items-start gap-1.5">
                    {displayStatus === 'active'
                      ? renewControl(t('renewEarly'), 'outline', 'sm')
                      : renewControl(t('renewYear'), 'default', 'default')}
                    <p className="text-xs text-muted-foreground">
                      {viewOnly
                        ? t('readOnlyRenew')
                        : displayStatus === 'active'
                          ? t('renewEarlyHint', { date: expiryDate ?? '' })
                          : t('renewHint')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {isOpen && (
            <div id={detailId}>
              {expiringSoon && expiryDate && (
                <AccountNotice
                  className="mx-6 mb-5 @max-[480px]:mx-[18px]"
                  icon={<CalendarClock />}
                  action={renewControl(t('renewYear'), 'default', 'sm')}
                >
                  {t.rich('expiresSoon', {
                    date: expiryDate,
                    days: daysLeft,
                    b: bold,
                  })}
                </AccountNotice>
              )}
              {displayStatus === 'suspended' && (
                <AccountNotice
                  className="mx-6 mb-5 @max-[480px]:mx-[18px]"
                  action={
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="text-foreground"
                    >
                      <Link href="/support">{tDownloads('contactSupport')}</Link>
                    </Button>
                  }
                >
                  {t('suspendedNotice')}
                </AccountNotice>
              )}

              <div className={cn('grid border-t', COLUMN_GRID[columnCount])}>
              {/* Sites carries the authoritative activation count, so it
                  shows on every licence. */}
                <section className={COLUMN_CLASS}>
                  <ColumnHeading
                    title={t('factSites')}
                    meta={t('activationsCount', {
                      count: license.activationCount,
                      max: license.maxMachines,
                    })}
                  />
                  {license.machines.length > 0 ? (
                  <DividedList>
                    {license.machines.map((machine) => {
                      const metadata = machine.metadata ?? {}
                      const siteLabel =
                        metaString(metadata, 'domain') ||
                        metaString(metadata, 'siteUrl') ||
                        machine.name ||
                        null
                      const lastSeen = metaString(metadata, 'lastSeenAt')
                      const pluginVersion = metaString(
                        metadata,
                        'pluginVersion'
                      )
                      const wpVersion = metaString(metadata, 'wpVersion')
                      const wcVersion = metaString(metadata, 'wcVersion')
                      // One quiet meta line per site: added · last seen ·
                      // versions. Everything secondary lives here so the
                      // domain stays the only loud thing.
                      const metaParts = [
                        t('machineAdded', {
                          date: formatDateForLocale(machine.createdAt, locale),
                        }),
                        lastSeen &&
                          t('lastSeen', {
                            date: formatDateForLocale(lastSeen, locale),
                          }),
                        pluginVersion &&
                          t('pluginVersionLabel', { version: pluginVersion }),
                        wpVersion && t('wpVersionLabel', { version: wpVersion }),
                        wcVersion && t('wcVersionLabel', { version: wcVersion }),
                      ].filter(Boolean) as string[]
                      const isConfirming = confirmingDeactivate === machine.id
                      const isDeactivating = deactivating === machine.id
                      const siteName = siteLabel || t('genericMachineName')

                      return (
                        <div
                          key={machine.id}
                          className="grid grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-x-2.5 py-3"
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              'size-2 rounded-full',
                              isRecentlySeen(lastSeen, now)
                                ? 'bg-green-500 ring-[3px] ring-green-500/15'
                                : 'bg-muted-foreground/40 ring-[3px] ring-muted'
                            )}
                          />
                          {/* Site domain when we know it, otherwise fall back
                              to the opaque fingerprint (which must be allowed
                              to break anywhere on phones). */}
                          <p className="break-all text-sm font-medium">
                            {siteLabel || machine.fingerprint}
                          </p>
                          {isConfirming ? (
                            <span />
                          ) : (
                            <Button
                              variant="ghost-destructive"
                              size="sm"
                              className="-me-1.5 h-7 gap-1.5 px-1.5"
                              onClick={() =>
                                setConfirmingDeactivate(machine.id)
                              }
                              disabled={isDeactivating || viewOnly}
                              aria-label={`${t('deactivateSite')}: ${siteName}`}
                            >
                              <Trash2 />
                              {t('deactivateSite')}
                            </Button>
                          )}
                          <p className="col-span-2 col-start-2 mt-0.5 break-words text-[13px] leading-[18px] text-muted-foreground">
                            {metaParts.join(' · ')}
                          </p>
                          {/* Expired licences still cover pre-expiry versions:
                              tell each activated site which version it can
                              still update through (ADR-0006, per licence). */}
                          {displayStatus === 'expired' && coveredVersion && (
                            <p className="col-span-2 col-start-2 text-[13px] leading-[18px] text-muted-foreground">
                              {t('siteUpdatesThrough', {
                                version: coveredVersion,
                              })}
                            </p>
                          )}
                          {isConfirming && (
                            <div
                              role="alertdialog"
                              aria-label={t('deactivateQuestion', { site: siteName })}
                              className="col-span-2 col-start-2 mt-2.5 rounded-md bg-red-50 p-3 dark:bg-red-500/10"
                            >
                              <p className="break-all text-sm font-semibold text-red-700 dark:text-red-400">
                                {t('deactivateQuestion', { site: siteName })}
                              </p>
                              <p className="mt-1 text-xs">
                                {t('deactivateSiteConfirm')}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {t('deactivateCacheNote')}
                              </p>
                              <div className="mt-2.5 flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-foreground"
                                  onClick={() => setConfirmingDeactivate(null)}
                                  disabled={isDeactivating}
                                >
                                  {t('deactivateCancel')}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    handleDeactivate(license.id, machine.id)
                                  }
                                  disabled={isDeactivating}
                                >
                                  <Trash2 />
                                  {t('deactivateConfirm')}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </DividedList>
                  ) : (
                    /* Only claim "no sites" when the AUTHORITATIVE count
                       agrees — the machine detail list can be empty while
                       activations exist (unauthenticated machine management). */
                    license.activationCount === 0 &&
                    displayStatus === 'active' && (
                      <p className="mt-2 text-[13px] text-muted-foreground">
                        {t('noSites')}
                      </p>
                    )
                  )}
                  <p className="mt-2 text-[13px] leading-[19px] text-muted-foreground">
                    {freeSlots > 0 && <>{t('slotsFree', { count: freeSlots })} </>}
                    {t('sitesCover', { max: license.maxMachines })}
                  </p>
                </section>

              {/* Discord access is scoped to this licence. Connected members
                  come from the server-side licence metadata projection; removal
                  updates the same licence-scoped module. */}
              <section className={COLUMN_CLASS}>
                <ColumnHeading
                  title={t('discordHeading')}
                  meta={t('discordMembers', {
                    count: discordAccess.usedSeats,
                    cap: discordAccess.seatCap,
                  })}
                />
                {discordMembers.length > 0 && (
                  <DividedList>
                    {discordMembers.map((member) => (
                    <div key={member.id} className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar aria-hidden="true" className="h-7 w-7 shrink-0">
                          {member.avatarUrl && (
                            <AvatarImage src={member.avatarUrl} alt="" />
                          )}
                          <AvatarFallback className="bg-wcpos-red/10 text-xs font-medium text-wcpos-red-accent">
                            {memberInitials(member.handle)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {member.handle}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('discordConnected', {
                              date: formatDateForLocale(
                                member.connectedAt,
                                locale
                              ),
                            })}
                          </p>
                        </div>
                        {confirmingRemove !== member.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmingRemove(member.id)}
                            disabled={viewOnly}
                            aria-label={t('discordRemoveAria', {
                              handle: member.handle,
                            })}
                          >
                            {t('discordRemove')}
                          </Button>
                        )}
                      </div>
                      {confirmingRemove === member.id && (
                        <div
                          role="alertdialog"
                          aria-label={t('discordRemoveAria', { handle: member.handle })}
                          className="mt-2 rounded-md bg-muted/60 p-3"
                        >
                          <p className="text-xs">
                            {t('discordRemoveQuestion', { handle: member.handle })}
                          </p>
                          <div className="mt-2.5 flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-foreground"
                              onClick={() => setConfirmingRemove(null)}
                              disabled={removingDiscordMember === member.id}
                            >
                              {t('deactivateCancel')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-foreground"
                              onClick={() =>
                                handleRemoveDiscordMember(license.id, member.id)
                              }
                              disabled={removingDiscordMember === member.id}
                            >
                              {t('discordRemove')}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    ))}
                  </DividedList>
                )}
                {/* Members the holder removed stay block-listed for this
                    licence (ADR-0007) until the holder allows them back.
                    "Allow reconnect" only lifts the block — the person still
                    has to reconnect themselves via the normal claim flow. */}
                {discordAccess.blockedMembers.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t('discordBlockedHeading')}
                    </p>
                    <DividedList className="mt-1">
                      {discordAccess.blockedMembers.map((blocked) => (
                        <Row key={blocked.discordUserId} className="gap-2 py-2.5">
                          <div className="flex min-w-0 items-center gap-2.5 opacity-70">
                            <Avatar aria-hidden="true" className="h-7 w-7 shrink-0">
                              {blocked.avatarUrl && (
                                <AvatarImage src={blocked.avatarUrl} alt="" />
                              )}
                              <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
                                {memberInitials(blocked.handle)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {blocked.handle}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t('discordBlockedNote')}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleUnblockDiscordMember(
                                license.id,
                                blocked.discordUserId
                              )
                            }
                            disabled={
                              viewOnly ||
                              unblockingDiscordUser === blocked.discordUserId
                            }
                            aria-label={t('discordUnblockAria', {
                              handle: blocked.handle,
                            })}
                          >
                            {t('discordUnblock')}
                          </Button>
                        </Row>
                      ))}
                    </DividedList>
                  </div>
                )}
                <p className="mt-2 text-[13px] leading-[19px] text-muted-foreground">
                  {displayStatus !== 'active'
                    ? t('discordNeedsActive')
                    : promptDiscordConnect
                      ? t('discordSupportPrompt')
                      : t('discordConnectHint')}
                </p>
                {displayStatus === 'active' && hasFreeDiscordSeat && (
                  <div className="mt-4 flex flex-col items-start gap-1.5">
                    {connectDiscord}
                    <p className="text-xs text-muted-foreground">
                      {viewOnly
                        ? t('discordReadOnly')
                        : t('discordConnectNote')}
                    </p>
                  </div>
                )}
              </section>

              {showDownloads && (
                <section className={COLUMN_CLASS}>
                  <ColumnHeading title={t('factDownloads')} />
                  <p className="mt-2 text-sm leading-[21px]">
                    {displayStatus === 'suspended'
                      ? t('downloadsSuspended')
                      : !coveredVersion
                        ? '—'
                        : displayStatus === 'expired'
                          ? t.rich('downloadsUpTo', {
                              version: coveredVersion,
                              date: expiryDate ?? '',
                              b: bold,
                            })
                          : isLifetime
                            ? t.rich('downloadsLifetime', {
                                version: coveredVersion,
                                b: bold,
                              })
                            : t.rich('downloadsActive', {
                                version: coveredVersion,
                                date: expiryDate ?? '',
                                b: bold,
                              })}
                  </p>
                  {displayStatus !== 'suspended' && (
                    <div className="mt-4">
                      <TextLink asChild className="inline-flex items-center gap-1 text-sm">
                        <Link
                          href={
                            displayStatus === 'expired'
                              ? scopedDownloadsHref
                              : '/account/downloads'
                          }
                        >
                          {t('downloads')}
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                      </TextLink>
                    </div>
                  )}
                </section>
              )}
              </div>
            </div>
            )}
          </Card>
          )
        })
      )}
    </>
  )
}
