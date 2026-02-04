import { getCustomer } from '@/lib/medusa-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ProfilePage() {
  const customer = await getCustomer()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{customer?.email}</span>
          </div>
          {customer?.first_name && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">First Name</span>
              <span>{customer.first_name}</span>
            </div>
          )}
          {customer?.last_name && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Name</span>
              <span>{customer.last_name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Member Since</span>
            <span>{new Date(customer?.created_at || '').toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
