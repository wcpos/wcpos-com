'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MapPin, Plus, Edit, Trash2 } from 'lucide-react'
import type { MedusaAddress } from '@/services/medusa/customer-service-v2'

interface AddressManagementProps {
  userId: string
  addresses: MedusaAddress[]
}

interface AddressFormData {
  first_name: string
  last_name: string
  phone: string
  company: string
  address_1: string
  address_2: string
  city: string
  country_code: string
  province: string
  postal_code: string
}

export function AddressManagement({ userId, addresses: initialAddresses }: AddressManagementProps) {
  const [addresses, setAddresses] = useState<MedusaAddress[]>(initialAddresses)
  const [isAddingAddress, setIsAddingAddress] = useState(false)
  const [editingAddress, setEditingAddress] = useState<MedusaAddress | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState<AddressFormData>({
    first_name: '',
    last_name: '',
    phone: '',
    company: '',
    address_1: '',
    address_2: '',
    city: '',
    country_code: 'US',
    province: '',
    postal_code: '',
  })

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      phone: '',
      company: '',
      address_1: '',
      address_2: '',
      city: '',
      country_code: 'US',
      province: '',
      postal_code: '',
    })
  }

  const handleAddAddress = async () => {
    setIsLoading(true)
    try {
      // In a real implementation, this would call the unified customer service
      // For now, we'll simulate the API call
      console.log('Adding address:', formData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Add the new address to the list (in real implementation, this would come from the API response)
      const newAddress: MedusaAddress = {
        id: `addr_${Date.now()}`,
        customer_id: userId,
        ...formData,
      }
      
      setAddresses([...addresses, newAddress])
      setIsAddingAddress(false)
      resetForm()
    } catch (error) {
      console.error('Failed to add address:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditAddress = async () => {
    if (!editingAddress) return
    
    setIsLoading(true)
    try {
      // In a real implementation, this would call the unified customer service
      console.log('Updating address:', editingAddress.id, formData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Update the address in the list
      setAddresses(addresses.map(addr => 
        addr.id === editingAddress.id 
          ? { ...addr, ...formData }
          : addr
      ))
      
      setEditingAddress(null)
      resetForm()
    } catch (error) {
      console.error('Failed to update address:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAddress = async (addressId: string) => {
    setIsLoading(true)
    try {
      // In a real implementation, this would call the unified customer service
      console.log('Deleting address:', addressId)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Remove the address from the list
      setAddresses(addresses.filter(addr => addr.id !== addressId))
    } catch (error) {
      console.error('Failed to delete address:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startEdit = (address: MedusaAddress) => {
    setEditingAddress(address)
    setFormData({
      first_name: address.first_name || '',
      last_name: address.last_name || '',
      phone: address.phone || '',
      company: address.company || '',
      address_1: address.address_1,
      address_2: address.address_2 || '',
      city: address.city,
      country_code: address.country_code,
      province: address.province || '',
      postal_code: address.postal_code,
    })
  }

  const AddressForm = ({ onSubmit, onCancel, submitLabel }: {
    onSubmit: () => void
    onCancel: () => void
    submitLabel: string
  }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="last_name">Last Name</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="company">Company (Optional)</Label>
        <Input
          id="company"
          value={formData.company}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="address_1">Address Line 1</Label>
        <Input
          id="address_1"
          value={formData.address_1}
          onChange={(e) => setFormData({ ...formData, address_1: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="address_2">Address Line 2 (Optional)</Label>
        <Input
          id="address_2"
          value={formData.address_2}
          onChange={(e) => setFormData({ ...formData, address_2: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="postal_code">Postal Code</Label>
          <Input
            id="postal_code"
            value={formData.postal_code}
            onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="province">State/Province</Label>
          <Input
            id="province"
            value={formData.province}
            onChange={(e) => setFormData({ ...formData, province: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="country_code">Country</Label>
          <select
            id="country_code"
            value={formData.country_code}
            onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="GB">United Kingdom</option>
            <option value="AU">Australia</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="IT">Italy</option>
            <option value="ES">Spain</option>
            <option value="NL">Netherlands</option>
            <option value="SE">Sweden</option>
            <option value="NO">Norway</option>
            <option value="DK">Denmark</option>
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="phone">Phone (Optional)</Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={isLoading}>
          {isLoading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </div>
  )

  if (addresses.length === 0 && !isAddingAddress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MapPin className="mr-2 h-5 w-5" />
            Addresses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Addresses</h3>
            <p className="text-gray-600 mb-4">
              Add an address to make checkout faster.
            </p>
            <Button onClick={() => setIsAddingAddress(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Address
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
            <MapPin className="mr-2 h-5 w-5" />
            Addresses
          </div>
          <Button onClick={() => setIsAddingAddress(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Address
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {addresses.map((address) => (
          <div key={address.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="font-medium">
                  {address.first_name} {address.last_name}
                </div>
                {address.company && (
                  <div className="text-sm text-gray-600">{address.company}</div>
                )}
                <div className="text-sm text-gray-600">
                  {address.address_1}
                  {address.address_2 && <br />}
                  {address.address_2}
                </div>
                <div className="text-sm text-gray-600">
                  {address.city}, {address.province} {address.postal_code}
                </div>
                <div className="text-sm text-gray-600">
                  {address.country_code.toUpperCase()}
                </div>
                {address.phone && (
                  <div className="text-sm text-gray-600">{address.phone}</div>
                )}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startEdit(address)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteAddress(address.id)}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {/* Add Address Dialog */}
        <Dialog open={isAddingAddress} onOpenChange={setIsAddingAddress}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Address</DialogTitle>
            </DialogHeader>
            <AddressForm
              onSubmit={handleAddAddress}
              onCancel={() => {
                setIsAddingAddress(false)
                resetForm()
              }}
              submitLabel="Add Address"
            />
          </DialogContent>
        </Dialog>

        {/* Edit Address Dialog */}
        <Dialog open={!!editingAddress} onOpenChange={(open) => {
          if (!open) {
            setEditingAddress(null)
            resetForm()
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Address</DialogTitle>
            </DialogHeader>
            <AddressForm
              onSubmit={handleEditAddress}
              onCancel={() => {
                setEditingAddress(null)
                resetForm()
              }}
              submitLabel="Update Address"
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}