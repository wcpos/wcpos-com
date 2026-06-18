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
import { Key, Monitor, Trash2, Download } from 'lucide-react'
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

interface License {
  id: string
  key: string
  status: CanonicalLicenseStatus
  expiry: string | null
  maxMachines: number
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
  const [error, setError] = useState<string | null>(null)
  const [deactivating, setDeactivating] = useState<string | null>(null)
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

  // Keygen can report status "active" after the expiry date has passed;
  // present those licenses as expired so the UI matches download entitlement.
  // (Shared rule: unparseable expiry fails closed, matching the server.)
  const getDisplayStatus = (license: License) =>
    getLicenseDisplayStatus(license, now)

  const getPlanLabel = (policyId: string) => {
    const plan = getPlanByPolicyId(policyId)
    return plan ? t(plan.labelKey) : null
  }

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
          const planLabel = getPlanLabel(license.policyId)
          // Per-licence attributed version (ADR-0006): null when this licence
          // alone covers nothing.
          const coveredVersion = entitledVersions[license.id] ?? null
          const scopedDownloadsHref = `/account/downloads?license=${encodeURIComponent(
            license.id
          )}`
          const discordAccess =
            discordAccessByLicenseState[license.id] ?? emptyDiscordAccess(license.id)
          const discordMembers = discordAccess.members
          return (
          <Card key={license.id}>
            <CardHeader>
              {/* flex-wrap so the badge/plan cluster drops below the key on
                  narrow phones instead of squeezing it. */}
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <CardTitle className="flex items-center gap-2.5 text-lg">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-wcpos-red/10 text-wcpos-red-accent"
                  >
                    <Key className="h-4 w-4" />
                  </span>
                  <code className="font-mono text-sm tracking-wider">
                    {maskKey(license.key)}
                  </code>
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
                      <Link href="/pro">{t('renew')}</Link>
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
                        count: license.machines.length,
                        max: license.maxMachines,
                      })}
                    </span>
                  </div>
                </div>
                {displayStatus === 'active' && (
                  <Button asChild size="sm">
                    <Link href="/account/downloads">
                      <Download className="mr-2 h-4 w-4" />
                      {t('downloads')}
                    </Link>
                  </Button>
                )}
                {displayStatus === 'expired' && (
                  <div className="flex items-center gap-2">
                    <Button asChild size="sm">
                      <Link href="/pro">{t('renew')}</Link>
                    </Button>
                    {/* Expired licenses can still download versions released
                        before their expiry; scope the downloads page to this
                        licence so another active licence does not pool access. */}
                    <Button asChild size="sm" variant="outline">
                      <Link href={scopedDownloadsHref}>
                        <Download className="mr-2 h-4 w-4" />
                        {t('downloads')}
                      </Link>
                    </Button>
                  </div>
                )}
              </div>

              {license.machines.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {t('activatedMachines')}
                  </p>
                  <DividedList className="mt-1">
                    {license.machines.map((machine) => (
                      <Row key={machine.id} className="items-start gap-2">
                        <div className="flex min-w-0 items-start gap-2.5">
                          <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            {/* Fingerprints are unbroken machine hashes — they
                                must be allowed to break anywhere or they blow
                                out the card on phones. */}
                            <p className="break-all text-sm font-medium">
                              {machine.name || machine.fingerprint}
                            </p>
                            {machine.name && (
                              <p className="break-all font-mono text-xs text-muted-foreground">
                                {machine.fingerprint}
                              </p>
                            )}
                            {/* Expired licences still cover pre-expiry versions:
                                tell each activated site which version it can
                                still update through (ADR-0006, per licence). */}
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
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDeactivate(license.id, machine.id)
                          }
                          disabled={deactivating === machine.id}
                          aria-label={t('deactivateMachineAria', {
                            name: machine.name || t('genericMachineName'),
                          })}
                        >
                          <Trash2
                            className={`h-4 w-4 ${
                              deactivating === machine.id
                                ? 'text-muted-foreground'
                                : 'text-destructive'
                            }`}
                          />
                        </Button>
                      </Row>
                    ))}
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
