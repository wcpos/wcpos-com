'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { User, Edit, Save, X } from 'lucide-react'
import type { UnifiedCustomer } from '@/services/customer/unified-customer-service'

interface ProfileEditProps {
  customer: UnifiedCustomer
  onUpdate?: (updatedCustomer: UnifiedCustomer) => void
}

interface ProfileFormData {
  firstName: string
  lastName: string
  phone: string
}

export function ProfileEdit({ customer, onUpdate }: ProfileEditProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: customer.medusaCustomer?.first_name || customer.firstName || '',
    lastName: customer.medusaCustomer?.last_name || customer.lastName || '',
    phone: customer.medusaCustomer?.phone || '',
  })

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // In a real implementation, this would call the unified customer service
      const response = await fetch('/api/customer/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      const updatedCustomer = await response.json()
      
      // Update the local state
      if (onUpdate) {
        onUpdate(updatedCustomer)
      }
      
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update profile:', error)
      // In a real app, you'd show a toast notification here
      alert('Failed to update profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      firstName: customer.medusaCustomer?.first_name || customer.firstName || '',
      lastName: customer.medusaCustomer?.last_name || customer.lastName || '',
      phone: customer.medusaCustomer?.phone || '',
    })
    setIsEditing(false)
  }

  const displayName = customer.medusaCustomer?.first_name || customer.firstName || 'Not set'
  const displayLastName = customer.medusaCustomer?.last_name || customer.lastName || 'Not set'
  const displayPhone = customer.medusaCustomer?.phone || 'Not set'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Profile Information
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-gray-600">Email</Label>
            <div className="font-medium">{customer.email}</div>
            <div className="text-xs text-gray-500 mt-1">
              Email cannot be changed here. Contact support if needed.
            </div>
          </div>
          
          <div>
            <Label className="text-sm text-gray-600">Account Status</Label>
            <div className="font-medium capitalize">{customer.status}</div>
          </div>
          
          <div>
            <Label className="text-sm text-gray-600">First Name</Label>
            <div className="font-medium">{displayName}</div>
          </div>
          
          <div>
            <Label className="text-sm text-gray-600">Last Name</Label>
            <div className="font-medium">{displayLastName}</div>
          </div>
          
          <div>
            <Label className="text-sm text-gray-600">Phone</Label>
            <div className="font-medium">{displayPhone}</div>
          </div>
          
          <div>
            <Label className="text-sm text-gray-600">Member Since</Label>
            <div className="font-medium">
              {new Date(customer.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </div>

        {customer.medusaCustomer && (
          <div className="pt-4 border-t">
            <div className="text-sm text-gray-600 mb-2">MedusaJS Customer Information</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Customer ID:</span>
                <div className="font-mono text-xs">{customer.medusaCustomer.id}</div>
              </div>
              <div>
                <span className="text-gray-500">Has Account:</span>
                <div>{customer.medusaCustomer.has_account ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Profile Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Enter your first name"
                />
              </div>

              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Enter your last name"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter your phone number"
                />
              </div>

              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <strong>Note:</strong> Changes will be synchronized between your WCPOS account and our commerce system.
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isLoading}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}