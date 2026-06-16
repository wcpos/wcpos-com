'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

// Display statuses with a dedicated translation. The underlying status
// values stay untouched (they drive entitlement logic and e2e selectors);
// only the badge label is translated, and unexpected statuses fall back to
// the raw value.
const TRANSLATED_STATUSES = [
  'active',
  'expired',
  'suspended',
  'revoked',
  'unknown',
] as const
type TranslatedStatus = (typeof TRANSLATED_STATUSES)[number]

function isTranslatedStatus(status: string): status is TranslatedStatus {
  return (TRANSLATED_STATUSES as readonly string[]).includes(status)
}

// Map each display status to a shared Badge variant. Semantics mirror the
// account download palette: success = entitled now, warning = natural
// lifecycle end (still keeps pre-expiry access), destructive = withdrawn by us
// (suspended/revoked), secondary = unverifiable.
type BadgeVariant = 'success' | 'warning' | 'destructive' | 'secondary'

function statusBadgeVariant(status: string): BadgeVariant {
  switch (status.toLowerCase()) {
    case 'active':
      return 'success'
    case 'expired':
      return 'warning'
    case 'suspended':
    case 'revoked':
      return 'destructive'
    default:
      return 'secondary'
  }
}

// Frontend stub for ADR-0007 (per-licence Discord access). The backend that
// resolves connected members is OUT OF SCOPE for this work package, so the
// section renders sample data with a default seat cap. Wiring this to real
// membership data is tracked separately.
interface DiscordMember {
  id: string
  handle: string
  avatarInitials: string
  connectedAt: string
}

const DISCORD_DEFAULT_CAP = 5

const SAMPLE_DISCORD_MEMBERS: DiscordMember[] = [
  {
    id: 'discord-sample-ada',
    handle: '@ada',
    avatarInitials: 'AL',
    connectedAt: '2026-03-14T00:00:00Z',
  },
  {
    id: 'discord-sample-devon',
    handle: '@devon',
    avatarInitials: 'DV',
    connectedAt: '2026-04-02T00:00:00Z',
  },
  {
    id: 'discord-sample-sam',
    handle: '@sam',
    avatarInitials: 'SM',
    connectedAt: '2026-05-18T00:00:00Z',
  },
]

interface LicensesClientProps {
  initialLicenses: License[]
  /**
   * Per-licence covered version (ADR-0006). Keyed by license id: the newest
   * release that licence is entitled to on its own, or null when none. Computed
   * server-side in the page so release dates never re-ship to the client.
   */
  entitledVersions?: Record<string, string | null>
}

export function LicensesClient({
  initialLicenses,
  entitledVersions = {},
}: LicensesClientProps) {
  const locale = useLocale()
  const t = useTranslations('account.licenses')
  const tStatus = useTranslations('account.licenseStatus')
  const [licenses, setLicenses] = useState<License[]>(initialLicenses)
  const [error, setError] = useState<string | null>(null)
  const [deactivating, setDeactivating] = useState<string | null>(null)
  // Captured once per mount so render stays pure for the React compiler.
  const [now] = useState(() => Date.now())

  // Discord membership is a frontend stub (ADR-0007); the Remove control only
  // prunes local sample state so the interaction is demonstrable.
  const [discordMembers, setDiscordMembers] = useState<DiscordMember[]>(
    SAMPLE_DISCORD_MEMBERS
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
      setLicenses(data.licenses || [])
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
        <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {licenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Key className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="font-medium">{t('emptyTitle')}</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {t('emptyDescription')}
            </p>
          </CardContent>
        </Card>
      ) : (
        licenses.map((license) => {
          const displayStatus = getDisplayStatus(license)
          const expiringSoon = isLicenseExpiringSoon(license, now)
          const planLabel = getPlanLabel(license.policyId)
          // Per-licence attributed version (ADR-0006): null when this licence
          // alone covers nothing.
          const coveredVersion = entitledVersions[license.id] ?? null
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
                  <Badge
                    variant={statusBadgeVariant(displayStatus)}
                    title={
                      displayStatus === 'unknown'
                        ? t('unknownStatusTooltip')
                        : undefined
                    }
                  >
                    {isTranslatedStatus(displayStatus)
                      ? tStatus(displayStatus)
                      : displayStatus}
                  </Badge>
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
                        before their expiry, so keep downloads reachable. */}
                    <Button asChild size="sm" variant="outline">
                      <Link href="/account/downloads">
                        <Download className="mr-2 h-4 w-4" />
                        {t('downloads')}
                      </Link>
                    </Button>
                  </div>
                )}
              </div>

              {license.machines.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {t('activatedMachines')}
                  </p>
                  {license.machines.map((machine) => (
                    <div
                      key={machine.id}
                      className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 p-3"
                    >
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
                        onClick={() => handleDeactivate(license.id, machine.id)}
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
                    </div>
                  ))}
                </div>
              )}

              {/* Discord access — frontend stub per ADR-0007. Membership data
                  is sample-only; the resolving backend is out of scope for this
                  work package. */}
              <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {t('discordHeading')}
                  </p>
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('discordMembers', {
                      count: discordMembers.length,
                      cap: DISCORD_DEFAULT_CAP,
                    })}
                  </span>
                </div>
                {discordMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-wcpos-red/10 text-xs font-medium text-wcpos-red-accent"
                      >
                        {member.avatarInitials}
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
                        setDiscordMembers((members) =>
                          members.filter((m) => m.id !== member.id)
                        )
                      }
                      aria-label={t('discordRemoveAria', {
                        handle: member.handle,
                      })}
                    >
                      {t('discordRemove')}
                    </Button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  {t('discordConnectHint')}
                </p>
              </div>
            </CardContent>
          </Card>
          )
        })
      )}
    </>
  )
}
