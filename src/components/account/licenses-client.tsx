'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { DividedList, Row } from '@/components/ui/row'
import { Alert } from '@/components/ui/alert'
import { EmptyState } from '@/components/ui/empty-state'
import { AccountNotice } from '@/components/account/account-notice'
import { Key, Monitor, Trash2, Download, Copy, Check } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { formatDateForLocale } from '@/lib/date-format'
import type { CanonicalLicenseStatus } from '@/lib/license-status'
import {
  getExpiringSoonExpiry,
  getLicenseDisplayStatus,
  isLicenseExpiringSoon,
} from '@/lib/license'
import { getPlanByPolicyId } from '@/lib/plans'
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

/**
 * Instance fingerprints are opaque hashes/tokens. Show a recognisable but
 * compact form so the row stays readable on a phone.
 */
function shortenInstance(fingerprint: string): string {
  if (fingerprint.length <= 14) return fingerprint
  return `${fingerprint.slice(0, 8)}…${fingerprint.slice(-4)}`
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
  handle: string
  avatarUrl: string | null
  connectedAt: string
}

interface DiscordAccess {
  licenseId: string
  seatCap: number
  usedSeats: number
  members: DiscordMember[]
}

const DISCORD_DEFAULT_CAP = 5

function emptyDiscordAccess(licenseId: string): DiscordAccess {
  return { licenseId, seatCap: DISCORD_DEFAULT_CAP, usedSeats: 0, members: [] }
}

function memberInitials(handle: string): string {
  const cleaned = handle.replace(/^@/, '').trim()
  if (!cleaned) return 'DC'
  return cleaned.slice(0, 2).toUpperCase()
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
}

export function LicensesClient({
  initialLicenses,
  entitledVersions = {},
  discordAccessByLicense = {},
}: LicensesClientProps) {
  const locale = useLocale()
  const t = useTranslations('account.licenses')
  const tStatus = useTranslations('account.licenseStatus')
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
  // Captured once per mount so render stays pure for the React compiler.
  const [now] = useState(() => Date.now())

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

  const fetchLicenses = async () => {
    setError(null)
    try {
      const res = await fetch('/api/account/licenses')
      if (!res.ok) {
        if (res.status === 401) {
          window.location.assign('/login')
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
      if (!res.ok) throw new Error('Failed to deactivate')
      await fetchLicenses()
    } catch {
      setError(t('deactivateError'))
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
          window.location.assign('/login')
          return
        }
        throw new Error('Failed to remove Discord member')
      }
      setDiscordAccessByLicenseState((accessByLicense) => {
        const current = accessByLicense[licenseId] ?? emptyDiscordAccess(licenseId)
        const members = current.members.filter((member) => member.id !== memberId)
        return {
          ...accessByLicense,
          [licenseId]: { ...current, members, usedSeats: members.length },
        }
      })
    } catch {
      setError(t('discordRemoveError'))
    } finally {
      setRemovingDiscordMember(null)
    }
  }

  const maskKey = (key: string) => {
    if (key.length <= 4) return '****'
    return '****-****-' + key.slice(-4)
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

  // When another active license (e.g. a lifetime one) keeps update access
  // open beyond the warning window, the per-card notice drops the "renew to
  // keep receiving updates" urgency — updates are not actually at risk.
  // Mirrors the account-level suppression on the overview page.
  const updateAccessLapsingSoon = getExpiringSoonExpiry(licenses, now) !== null

  return (
    <>
      {error && (
        <Alert tone="critical" role="alert">
          {error}
        </Alert>
      )}

      {licenses.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Key />}
            title={t('emptyTitle')}
            description={t('emptyDescription')}
          />
        </Card>
      ) : (
        licenses.map((license) => {
          const displayStatus = getDisplayStatus(license)
          const statusPresentation = presentLicenseStatus(displayStatus)
          const expiringSoon = isLicenseExpiringSoon(license, now)
          const plan = getPlanByPolicyId(license.policyId)
          const planLabel = plan ? t(plan.labelKey) : null
          // A licence is renewable when it has an expiry to extend; a lifetime
          // licence (null expiry) never renews. Deep-link to the pre-filled
          // yearly checkout when the plan handle resolves (else the generic
          // /pro). On payment the Medusa order-completed subscriber extends the
          // SAME licence using the locked max(expiry, now) + 1yr rule.
          const isRenewable = license.expiry != null
          const renewHref = plan?.handle
            ? `/pro/checkout?product=${plan.handle}`
            : '/pro'
          // Always offer renewal on a renewable licence that is active or
          // expired, EXCEPT while the expiring-soon banner is already showing
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
          const keyRevealed = revealedKeys.has(license.id)
          const keyCopied = copiedKey === license.id
          // Last-4 of the key distinguishes each card's controls in the
          // accessible name — with multiple licences the buttons would
          // otherwise all announce the same label to screen readers.
          const keySuffix = license.key.slice(-4)
          return (
          <Card key={license.id}>
            <CardHeader>
              {/* flex-wrap so the badge/plan cluster drops below the key on
                  narrow phones instead of squeezing it. */}
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <CardTitle className="flex min-w-0 items-center gap-1.5 text-lg">
                  <button
                    type="button"
                    onClick={() => toggleRevealKey(license.id)}
                    aria-pressed={keyRevealed}
                    title={t(keyRevealed ? 'hideKeyAria' : 'showKeyAria', {
                      suffix: keySuffix,
                    })}
                    aria-label={t(keyRevealed ? 'hideKeyAria' : 'showKeyAria', {
                      suffix: keySuffix,
                    })}
                    className="group flex min-w-0 items-center gap-2.5 rounded-md text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wcpos-red/40"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-wcpos-red/10 text-wcpos-red-accent transition-colors group-hover:bg-wcpos-red/20"
                    >
                      <Key className="h-4 w-4" />
                    </span>
                    <code className="break-all font-mono text-sm tracking-wider">
                      {keyRevealed ? license.key : maskKey(license.key)}
                    </code>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyKey(license.id, license.key)}
                    title={
                      keyCopied
                        ? t('copiedKey')
                        : t('copyKeyAria', { suffix: keySuffix })
                    }
                    aria-label={
                      keyCopied
                        ? t('copiedKey')
                        : t('copyKeyAria', { suffix: keySuffix })
                    }
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wcpos-red/40"
                  >
                    {keyCopied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    tone={statusPresentation.tone}
                    title={
                      statusPresentation.titleKey
                        ? t(statusPresentation.titleKey)
                        : undefined
                    }
                  >
                    {tStatus(statusPresentation.labelKey)}
                  </StatusBadge>
                  {planLabel && (
                    <Badge variant="outline" className="text-muted-foreground">
                      {planLabel}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {expiringSoon && license.expiry && (
                <AccountNotice
                  action={
                    <Button asChild size="sm">
                      <Link href={renewHref} prefetch={false}>
                        {t('renew')}
                      </Link>
                    </Button>
                  }
                >
                  {t(
                    updateAccessLapsingSoon ? 'expiresSoonRenew' : 'expiresSoon',
                    { date: formatDateForLocale(license.expiry, locale) }
                  )}
                </AccountNotice>
              )}

              {displayStatus === 'unknown' && (
                <p className="text-sm text-muted-foreground">
                  {t.rich('unverifiable', {
                    supportLink: (chunks) => (
                      <Link
                        href="/support"
                        className="underline underline-offset-4"
                      >
                        {chunks}
                      </Link>
                    ),
                  })}
                </p>
              )}

              {/* Per-licence covered version (ADR-0006): an active licence shows
                  the latest version it grants; an expired one shows the last
                  version released during its term. Update access is attributed
                  to THIS licence, never pooled across licences. */}
              {coveredVersion && displayStatus === 'active' && (
                <p className="text-sm text-muted-foreground">
                  {t('coversLatestVersion', { version: coveredVersion })}
                </p>
              )}
              {coveredVersion && displayStatus === 'expired' && (
                <p className="text-sm text-muted-foreground">
                  {t('coversUpToVersion', { version: coveredVersion })}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  {license.expiry && (
                    <div>
                      <span className="text-muted-foreground">
                        {t('expiresLabel')}{' '}
                      </span>
                      <span className="font-medium">
                        {formatDateForLocale(license.expiry, locale)}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">
                      {t('activationsLabel')}{' '}
                    </span>
                    <span className="font-medium">
                      {t('activationsCount', {
                        count: license.activationCount,
                        max: license.maxMachines,
                      })}
                    </span>
                  </div>
                </div>
                {(displayStatus === 'active' ||
                  displayStatus === 'expired') && (
                  <div className="flex items-center gap-2">
                    {/* Renew is always offered on a yearly licence: primary when
                        expired (needed to regain access), secondary when active
                        (an optional early renewal — no days are lost). */}
                    {showRenew && (
                      <Button
                        asChild
                        size="sm"
                        variant={displayStatus === 'active' ? 'outline' : 'default'}
                      >
                        <Link href={renewHref} prefetch={false}>
                          {t('renew')}
                        </Link>
                      </Button>
                    )}
                    {displayStatus === 'active' && (
                      <Button asChild size="sm">
                        <Link href="/account/downloads">
                          <Download className="mr-2 h-4 w-4" />
                          {t('downloads')}
                        </Link>
                      </Button>
                    )}
                    {displayStatus === 'expired' && (
                      /* Expired licenses can still download versions released
                         before their expiry; scope the downloads page to this
                         licence so another active licence does not pool access. */
                      <Button asChild size="sm" variant="outline">
                        <Link href={scopedDownloadsHref}>
                          <Download className="mr-2 h-4 w-4" />
                          {t('downloads')}
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {license.machines.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {t('activatedSites')}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('activatedSitesHelp')}
                  </p>
                  <DividedList className="mt-2">
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
                      const versionParts = [
                        pluginVersion &&
                          t('pluginVersionLabel', {
                            version: pluginVersion,
                          }),
                        wpVersion &&
                          t('wpVersionLabel', {
                            version: wpVersion,
                          }),
                        wcVersion &&
                          t('wcVersionLabel', {
                            version: wcVersion,
                          }),
                      ].filter(Boolean) as string[]
                      const isConfirming = confirmingDeactivate === machine.id
                      const isDeactivating = deactivating === machine.id

                      return (
                        <Row key={machine.id} className="items-start gap-2">
                          <div className="flex min-w-0 items-start gap-2.5">
                            <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              {/* Site domain when we know it, otherwise fall
                                  back to the opaque fingerprint (which must be
                                  allowed to break anywhere on phones). */}
                              <p className="break-all text-sm font-medium">
                                {siteLabel || machine.fingerprint}
                              </p>
                              <p className="break-all font-mono text-xs text-muted-foreground">
                                {t('instanceId', {
                                  id: shortenInstance(machine.fingerprint),
                                })}
                              </p>
                              {/* Expired licences still cover pre-expiry
                                  versions: tell each activated site which
                                  version it can still update through
                                  (ADR-0006, per licence). */}
                              {displayStatus === 'expired' && coveredVersion && (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {t('siteUpdatesThrough', {
                                    version: coveredVersion,
                                  })}
                                </p>
                              )}
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {t('machineAdded', {
                                  date: formatDateForLocale(
                                    machine.createdAt,
                                    locale
                                  ),
                                })}
                              </p>
                              {lastSeen && (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {t('lastSeen', {
                                    date: formatDateForLocale(lastSeen, locale),
                                  })}
                                </p>
                              )}
                              {versionParts.length > 0 && (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {versionParts.join(' · ')}
                                </p>
                              )}
                            </div>
                          </div>
                          {isConfirming ? (
                            <div className="flex max-w-[15rem] shrink-0 flex-col items-end gap-1.5 text-right">
                              <p className="text-xs text-muted-foreground">
                                {t('deactivateSiteConfirm')}
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
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
                                  {t('deactivateConfirm')}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0 text-destructive"
                              onClick={() =>
                                setConfirmingDeactivate(machine.id)
                              }
                              disabled={isDeactivating}
                              aria-label={t('deactivateMachineAria', {
                                name: siteLabel || t('genericMachineName'),
                              })}
                            >
                              <Trash2 className="mr-1.5 h-4 w-4" />
                              {t('deactivateSite')}
                            </Button>
                          )}
                        </Row>
                      )
                    })}
                  </DividedList>
                </div>
              )}

              {/* Discord access is scoped to this licence. Connected members
                  come from the server-side licence metadata projection; removal
                  updates the same licence-scoped module. */}
              <div className="border-t pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {t('discordHeading')}
                  </p>
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('discordMembers', {
                      count: discordAccess.usedSeats,
                      cap: discordAccess.seatCap,
                    })}
                  </span>
                </div>
                {discordMembers.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('discordNoMembers')}
                  </p>
                ) : (
                  <DividedList className="mt-1">
                    {discordMembers.map((member) => (
                    <Row key={member.id} className="gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-wcpos-red/10 text-xs font-medium text-wcpos-red-accent"
                        >
                          {memberInitials(member.handle)}
                        </span>
                        <div className="min-w-0">
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
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleRemoveDiscordMember(license.id, member.id)
                        }
                        disabled={removingDiscordMember === member.id}
                        aria-label={t('discordRemoveAria', {
                          handle: member.handle,
                        })}
                      >
                        {t('discordRemove')}
                      </Button>
                    </Row>
                    ))}
                  </DividedList>
                )}
                {displayStatus === 'active' && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {t('discordConnectHint')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          )
        })
      )}
    </>
  )
}
