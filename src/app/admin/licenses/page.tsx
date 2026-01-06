import { AdminHeader } from '@/components/admin/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LicensesPage() {
  return (
    <div className="flex flex-col">
      <AdminHeader
        title="Licenses"
        description="Manage license keys and activations"
      />

      <div className="flex-1 p-6">
        <Card>
          <CardHeader>
            <CardTitle>License Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              License management will be available once the new license server
              is integrated. This page will allow you to:
            </p>
            <ul className="mt-4 list-inside list-disc space-y-2 text-muted-foreground">
              <li>View all license keys</li>
              <li>Check activation status</li>
              <li>Revoke or extend licenses</li>
              <li>Generate new license keys</li>
              <li>View activation history</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

