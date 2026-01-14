import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, Mail, Calendar, Shield } from 'lucide-react'
import type { User as UserType } from '@/services/core/database/schema'

interface AccountOverviewProps {
  user: UserType
}

export function AccountOverview({ user }: AccountOverviewProps) {
  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const statusColor = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    suspended: 'bg-red-100 text-red-800'
  }[user.status]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <User className="mr-2 h-5 w-5" />
          Account Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <Mail className="mr-2 h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Email:</span>
              <span className="ml-2 font-medium">{user.email}</span>
            </div>
            
            {user.firstName && (
              <div className="flex items-center text-sm">
                <User className="mr-2 h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium">
                  {user.firstName} {user.lastName || ''}
                </span>
              </div>
            )}
            
            <div className="flex items-center text-sm">
              <Calendar className="mr-2 h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Member since:</span>
              <span className="ml-2 font-medium">{memberSince}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <Shield className="mr-2 h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Status:</span>
              <Badge className={`ml-2 ${statusColor}`}>
                {user.status}
              </Badge>
            </div>
            
            <div className="flex items-center text-sm">
              <span className="text-gray-600">Email verified:</span>
              <Badge className={`ml-2 ${user.emailVerified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {user.emailVerified ? 'Verified' : 'Unverified'}
              </Badge>
            </div>
            
            {user.lastLoginAt && (
              <div className="flex items-center text-sm">
                <span className="text-gray-600">Last login:</span>
                <span className="ml-2 font-medium">
                  {new Date(user.lastLoginAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}