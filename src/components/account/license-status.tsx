import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Key, RefreshCw, ExternalLink } from 'lucide-react'
import { db } from '@/services/core/database/connection'
import { licenseKeys } from '@/services/core/database/schema'
import { eq } from 'drizzle-orm'

interface LicenseStatusProps {
  userId: string
}

export async function LicenseStatus({ userId }: LicenseStatusProps) {
  // Fetch user's licenses - this will be dynamic
  const userLicenses = db ? await db
    .select()
    .from(licenseKeys)
    .where(eq(licenseKeys.userId, userId))
    .orderBy(licenseKeys.createdAt) : []

  if (!userLicenses.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="mr-2 h-5 w-5" />
            Licenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Key className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No licenses found</h3>
            <p className="text-gray-600 mb-4">
              You don't have any active licenses yet.
            </p>
            <Button asChild>
              <a href="/#pricing" className="inline-flex items-center">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Plans
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Key className="mr-2 h-5 w-5" />
            Licenses
          </div>
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {userLicenses.map((license) => {
          const isExpired = license.expiresAt && new Date(license.expiresAt) < new Date()
          const statusColor = {
            active: 'bg-green-100 text-green-800',
            expired: 'bg-red-100 text-red-800',
            revoked: 'bg-gray-100 text-gray-800'
          }[isExpired ? 'expired' : license.status]

          return (
            <div key={license.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{license.productId}</div>
                <Badge className={statusColor}>
                  {isExpired ? 'Expired' : license.status}
                </Badge>
              </div>
              
              <div className="text-sm text-gray-600 space-y-1">
                <div>
                  Activations: {license.currentActivations}/{license.maxActivations}
                </div>
                {license.expiresAt && (
                  <div>
                    Expires: {new Date(license.expiresAt).toLocaleDateString()}
                  </div>
                )}
              </div>
              
              {isExpired && (
                <Button size="sm" className="mt-3">
                  Renew License
                </Button>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}