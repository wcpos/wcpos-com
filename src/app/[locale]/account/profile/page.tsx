import { setRequestLocale } from 'next-intl/server'
import { Suspense } from 'react'
import { getCustomer } from '@/lib/medusa-auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

async function ProfileContent() {
  const customer = await getCustomer()

  if (!customer) {
    redirect('/login')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Account Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Email</span>
          <span>{customer.email}</span>
        </div>
        {customer.first_name && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">First Name</span>
            <span>{customer.first_name}</span>
          </div>
        )}
        {customer.last_name && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Name</span>
            <span>{customer.last_name}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Member Since</span>
          <span>{new Date(customer.created_at).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function ProfileSkeleton() {
  return (
    <Card>
      <CardContent className="py-6 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between">
            <div className="h-5 w-24 bg-muted rounded animate-pulse" />
            <div className="h-5 w-32 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent />
      </Suspense>
    </div>
  )
}
