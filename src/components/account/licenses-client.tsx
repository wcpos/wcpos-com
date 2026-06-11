'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Key, Monitor, Trash2, Download } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { formatDateForLocale } from '@/lib/date-format'
import {
  getExpiringSoonExpiry,
  getLicenseDisplayStatus,
  isLicenseExpiringSoon,
} from '@/lib/license-display'

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
  status: string
  expiry: string | null
  maxMachines: number
  machines: Machine[]
  metadata: Record<string, unknown>
  policyId: string
  createdAt: string
}

const YEARLY_POLICY = '261cb7e2-6e80-476e-98bd-fe7f406f258d'

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

interface LicensesClientProps {
  initialLicenses: License[]
}

export function LicensesClient({ initialLicenses }: LicensesClientProps) {
  const locale = useLocale()
  const t = useTranslations('account.licenses')
  const tStatus = useTranslations('account.licenseStatus')
  const [licenses, setLicenses] = useState<License[]>(initialLicenses)
  const [error, setError] = useState<string | null>(null)
  const [deactivating, setDeactivating] = useState<string | null>(null)
  // Captured once per mount so render stays pure for the React compiler.
  const [now] = useState(() => Date.now())

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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'text-green-600 bg-green-50'
      case 'expired': return 'text-red-600 bg-red-50'
      case 'suspended': return 'text-yellow-600 bg-yellow-50'
      case 'revoked': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // Keygen can report status "active" after the expiry date has passed;
  // present those licenses as expired so the UI matches download entitlement.
  // (Shared rule: unparseable expiry fails closed, matching the server.)
  const getDisplayStatus = (license: License) =>
    getLicenseDisplayStatus(license.status, license.expiry, now)

  const getPlanName = (policyId: string) => {
    return policyId === YEARLY_POLICY ? t('planYearly') : t('planLifetime')
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
          <CardContent className="py-8 text-center text-muted-foreground">
            <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t('emptyTitle')}</p>
            <p className="text-sm mt-1">{t('emptyDescription')}</p>
          </CardContent>
        </Card>
      ) : (
        licenses.map((license) => {
          const displayStatus = getDisplayStatus(license)
          const expiringSoon = isLicenseExpiringSoon(license, now)
          return (
          <Card key={license.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  <code className="text-sm font-mono">{maskKey(license.key)}</code>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded capitalize ${getStatusColor(displayStatus)}`}
                    title={
                      displayStatus === 'unknown'
                        ? t('unknownStatusTooltip')
                        : undefined
                    }
                  >
                    {isTranslatedStatus(displayStatus)
                      ? tStatus(displayStatus)
                      : displayStatus}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {getPlanName(license.policyId)}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {expiringSoon && license.expiry && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p>
                    {t(
                      updateAccessLapsingSoon
                        ? 'expiresSoonRenew'
                        : 'expiresSoon',
                      { date: formatDateForLocale(license.expiry, locale) }
                    )}
                  </p>
                  <Button asChild size="sm">
                    <Link href="/pro">{t('renew')}</Link>
                  </Button>
                </div>
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

              <div className="flex items-center justify-between">
                <div className="flex gap-6 text-sm">
                  {license.expiry && (
                    <div>
                      <span className="text-muted-foreground">
                        {t('expiresLabel')}{' '}
                      </span>
                      <span>{formatDateForLocale(license.expiry, locale)}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">
                      {t('activationsLabel')}{' '}
                    </span>
                    <span>
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
                  <p className="text-sm font-medium">{t('activatedMachines')}</p>
                  {license.machines.map((machine) => (
                    <div
                      key={machine.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {machine.name || machine.fingerprint}
                          </p>
                          {machine.name && (
                            <p className="text-xs text-muted-foreground">{machine.fingerprint}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
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
            </CardContent>
          </Card>
          )
        })
      )}
    </>
  )
}
