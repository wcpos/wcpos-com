import 'server-only'

import { medusaClient, type MedusaCustomer, type MedusaAddress, type MedusaOrder } from './medusa-client'

/**
 * MedusaJS Customer Service
 * 
 * Handles all customer-related operations with the MedusaJS backend.
 * This service acts as the bridge between your Next.js frontend and MedusaJS.
 */
export class MedusaCustomerService {
  /**
   * Create a new customer in MedusaJS
   */
  static async createCustomer(data: {
    email: string
    first_name?: string
    last_name?: string
    phone?: string
    password?: string
  }): Promise<{ success: boolean; customer?: MedusaCustomer; error?: string }> {
    try {
      const response = await medusaClient.store.customer.create({
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        password: data.password,
      })

      return { success: true, customer: response.customer }
    } catch (error: any) {
      console.error('[MedusaCustomerService] Create customer error:', error)
      return { 
        success: false, 
        error: error.message || 'Failed to create customer' 
      }
    }
  }

  /**
   * Authenticate customer with email/password
   */
  static async authenticateCustomer(
    email: string, 
    password: string
  ): Promise<{ success: boolean; customer?: MedusaCustomer; token?: string; error?: string }> {
    try {
      const response = await medusaClient.auth.login('customer', {
        email,
        password,
      })

      if (response.token) {
        // Set the token for future requests
        medusaClient.setToken(response.token)
        
        // Get customer details
        const customerResponse = await medusaClient.store.customer.retrieve()
        
        return { 
          success: true, 
          customer: customerResponse.customer,
          token: response.token
        }
      }

      return { success: false, error: 'Authentication failed' }
    } catch (error: any) {
      console.error('[MedusaCustomerService] Authentication error:', error)
      return { 
        success: false, 
        error: error.message || 'Authentication failed' 
      }
    }
  }

  /**
   * Get customer by ID with expanded data
   */
  static async getCustomer(
    customerId: string,
    expand?: string[]
  ): Promise<MedusaCustomer | null> {
    try {
      const response = await medusaClient.store.customer.retrieve({
        expand: expand || ['addresses', 'orders', 'orders.items']
      })

      return response.customer
    } catch (error) {
      console.error('[MedusaCustomerService] Get customer error:', error)
      return null
    }
  }

  /**
   * Update customer information
   */
  static async updateCustomer(
    customerId: string,
    data: {
      first_name?: string
      last_name?: string
      phone?: string
      metadata?: Record<string, unknown>
    }
  ): Promise<{ success: boolean; customer?: MedusaCustomer; error?: string }> {
    try {
      const response = await medusaClient.store.customer.update(data)

      return { success: true, customer: response.customer }
    } catch (error: any) {
      console.error('[MedusaCustomerService] Update customer error:', error)
      return { 
        success: false, 
        error: error.message || 'Failed to update customer' 
      }
    }
  }

  /**
   * Add address to customer
   */
  static async addCustomerAddress(
    customerId: string,
    addressData: {
      first_name?: string
      last_name?: string
      phone?: string
      company?: string
      address_1: string
      address_2?: string
      city: string
      country_code: string
      province?: string
      postal_code: string
    }
  ): Promise<{ success: boolean; address?: MedusaAddress; error?: string }> {
    try {
      const response = await medusaClient.store.customer.address.create(addressData)

      return { success: true, address: response.address }
    } catch (error: any) {
      console.error('[MedusaCustomerService] Add address error:', error)
      return { 
        success: false, 
        error: error.message || 'Failed to add address' 
      }
    }
  }

  /**
   * Update customer address
   */
  static async updateCustomerAddress(
    addressId: string,
    addressData: Partial<{
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
    }>
  ): Promise<{ success: boolean; address?: MedusaAddress; error?: string }> {
    try {
      const response = await medusaClient.store.customer.address.update(
        addressId,
        addressData
      )

      return { success: true, address: response.address }
    } catch (error: any) {
      console.error('[MedusaCustomerService] Update address error:', error)
      return { 
        success: false, 
        error: error.message || 'Failed to update address' 
      }
    }
  }

  /**
   * Delete customer address
   */
  static async deleteCustomerAddress(addressId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await medusaClient.store.customer.address.delete(addressId)
      return { success: true }
    } catch (error: any) {
      console.error('[MedusaCustomerService] Delete address error:', error)
      return { 
        success: false, 
        error: error.message || 'Failed to delete address' 
      }
    }
  }

  /**
   * Get customer orders
   */
  static async getCustomerOrders(
    customerId: string,
    limit = 10,
    offset = 0
  ): Promise<MedusaOrder[]> {
    try {
      const response = await medusaClient.store.customer.order.list({
        limit,
        offset,
        expand: ['items', 'items.variant', 'items.variant.product']
      })

      return response.orders || []
    } catch (error) {
      console.error('[MedusaCustomerService] Get orders error:', error)
      return []
    }
  }

  /**
   * Find customer by email
   */
  static async findCustomerByEmail(email: string): Promise<MedusaCustomer | null> {
    try {
      // Note: This might require a custom API endpoint in MedusaJS
      // as the standard customer endpoints don't support email lookup
      const response = await medusaClient.store.customer.list({
        email: email
      })

      return response.customers?.[0] || null
    } catch (error) {
      console.error('[MedusaCustomerService] Find by email error:', error)
      return null
    }
  }

  /**
   * Handle OAuth customer creation/login
   */
  static async handleOAuthCustomer(data: {
    email: string
    first_name?: string
    last_name?: string
    provider: 'google' | 'github'
    provider_id: string
  }): Promise<{ success: boolean; customer?: MedusaCustomer; isNew?: boolean; error?: string }> {
    try {
      // First, try to find existing customer by email
      let customer = await this.findCustomerByEmail(data.email)
      
      if (customer) {
        // Update metadata to include OAuth info if not already present
        const metadata = customer.metadata || {}
        const oauthKey = `${data.provider}_id`
        
        if (!metadata[oauthKey]) {
          const updateResult = await this.updateCustomer(customer.id, {
            metadata: {
              ...metadata,
              [oauthKey]: data.provider_id,
            }
          })
          
          if (updateResult.success) {
            customer = updateResult.customer!
          }
        }
        
        return { success: true, customer, isNew: false }
      }

      // Create new customer
      const createResult = await this.createCustomer({
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
      })

      if (!createResult.success) {
        return createResult
      }

      // Add OAuth metadata
      const updateResult = await this.updateCustomer(createResult.customer!.id, {
        metadata: {
          [`${data.provider}_id`]: data.provider_id,
          oauth_provider: data.provider,
        }
      })

      return { 
        success: true, 
        customer: updateResult.customer || createResult.customer,
        isNew: true 
      }
    } catch (error: any) {
      console.error('[MedusaCustomerService] OAuth customer error:', error)
      return { 
        success: false, 
        error: error.message || 'Failed to handle OAuth customer' 
      }
    }
  }
}