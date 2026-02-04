'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Key, Monitor, Trash2 } from 'lucide-react'

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

export function LicensesClient() {
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deactivating, setDeactivating] = useState<string | null>(null)

  const fetchLicenses = async () => {
    setError(null)
    try {
      const res = await fetch('/api/account/licenses')
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login'
          return
        }
        throw new Error('Failed to fetch licenses')
      }
      const data = await res.json()
      setLicenses(data.licenses || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load licenses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLicenses()
  }, [])

  const handleDeactivate = async (licenseId: string, machineId: string) => {
    setDeactivating(machineId)
    try {
      const res = await fetch(`/api/account/licenses/${licenseId}/machines/${machineId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to deactivate')
      await fetchLicenses()
    } catch {
      setError('Failed to deactivate machine. Please try again.')
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
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getPlanName = (policyId: string) => {
    return policyId === YEARLY_POLICY ? 'Yearly' : 'Lifetime'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

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
            <p>No licenses found.</p>
            <p className="text-sm mt-1">Purchase WooCommerce POS Pro to get a license.</p>
          </CardContent>
        </Card>
      ) : (
        licenses.map((license) => (
          <Card key={license.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  <code className="text-sm font-mono">{maskKey(license.key)}</code>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(license.status)}`}>
                    {license.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {getPlanName(license.policyId)}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-6 text-sm">
                {license.expiry && (
                  <div>
                    <span className="text-muted-foreground">Expires: </span>
                    <span>{new Date(license.expiry).toLocaleDateString()}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Activations: </span>
                  <span>{license.machines.length} of {license.maxMachines}</span>
                </div>
              </div>

              {license.machines.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Activated Machines</p>
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
                            Added {new Date(machine.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeactivate(license.id, machine.id)}
                        disabled={deactivating === machine.id}
                        aria-label={`Deactivate ${machine.name || 'machine'}`}
                      >
                        {deactivating === machine.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </>
  )
}
