import 'server-only'

import { medusaClient, type MedusaCustomer, type MedusaAddress, type MedusaOrder } from './medusa-client'

/* eslint-disable @typescript-eslint/no-unused-vars */

// Re-export types for use in other modules
export type { MedusaCustomer, MedusaAddress, MedusaOrder }

/**
 * MedusaJS Customer Service (v2 Compatible)
 * 
 * This service provides customer management functionality using MedusaJS v2 SDK.
 * Note: Some methods are placeholders and need to be updated with the correct
 * MedusaJS v2 API calls once the documentation is available.
 */
export class MedusaCustomerService {
  /**
   * Create a new customer in MedusaJS
   */
  static async createCustomer(data: {
    email: string
    password: string
    first_name?: string
    last_name?: string
    phone?: string
  }): Promise<{ success: boolean; customer?: MedusaCustomer; error?: string }> {
    try {
      const response = await medusaClient.store.customer.create({
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
      })

      return { success: true, customer: response.customer }
    } catch (error: unknown) {
      console.error('[MedusaCustomerService] Create customer error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create customer' 
      }
    }
  }

  /**
   * Authenticate customer with email and password
   * Note: This is a placeholder implementation for MedusaJS v2
   */
  static async authenticateCustomer(_email: string, _password: string): Promise<{
    success: boolean
    customer?: MedusaCustomer
    token?: string
    error?: string
  }> {
    try {
      // TODO: Update this to use the correct MedusaJS v2 authentication API
      console.log('[MedusaCustomerService] Authentication placeholder for MedusaJS v2')
      return { 
        success: false, 
        error: 'Authentication API needs to be updated for MedusaJS v2' 
      }
    } catch (error: unknown) {
      console.error('[MedusaCustomerService] Authentication error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Authentication failed' 
      }
    }
  }

  /**
   * Get customer by email
   */
  static async getCustomerByEmail(_email: string): Promise<MedusaCustomer | null> {
    try {
      // TODO: Update this to use the correct MedusaJS v2 API for finding customers by email
      console.log('[MedusaCustomerService] Get customer by email placeholder for MedusaJS v2')
      return null
    } catch (error: unknown) {
      console.error('[MedusaCustomerService] Get customer by email error:', error)
      return null
    }
  }

  /**
   * Update customer information
   */
  static async updateCustomer(data: {
    first_name?: string
    last_name?: string
    phone?: string
  }): Promise<{ success: boolean; customer?: MedusaCustomer; error?: string }> {
    try {
      const response = await medusaClient.store.customer.update(data)

      return { success: true, customer: response.customer }
    } catch (error: unknown) {
      console.error('[MedusaCustomerService] Update customer error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update customer' 
      }
    }
  }

  /**
   * Add customer address
   * Note: This is a placeholder implementation for MedusaJS v2
   */
  static async addCustomerAddress(_addressData: {
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
  }): Promise<{ success: boolean; address?: MedusaAddress; error?: string }> {
    try {
      // TODO: Update this to use the correct MedusaJS v2 address API
      console.log('[MedusaCustomerService] Add address placeholder for MedusaJS v2')
      return { 
        success: false, 
        error: 'Address API needs to be updated for MedusaJS v2' 
      }
    } catch (error: unknown) {
      console.error('[MedusaCustomerService] Add address error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to add address' 
      }
    }
  }

  /**
   * Update customer address
   * Note: This is a placeholder implementation for MedusaJS v2
   */
  static async updateCustomerAddress(
    _addressId: string,
    _addressData: {
      first_name?: string
      last_name?: string
      phone?: string
      company?: string
      address_1?: string
      address_2?: string
      city?: string
      country_code?: string
      province?: string
      postal_code?: string
    }
  ): Promise<{ success: boolean; address?: MedusaAddress; error?: string }> {
    try {
      // TODO: Update this to use the correct MedusaJS v2 address API
      console.log('[MedusaCustomerService] Update address placeholder for MedusaJS v2')
      return { 
        success: false, 
        error: 'Address API needs to be updated for MedusaJS v2' 
      }
    } catch (error: unknown) {
      console.error('[MedusaCustomerService] Update address error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update address' 
      }
    }
  }

  /**
   * Delete customer address
   * Note: This is a placeholder implementation for MedusaJS v2
   */
  static async deleteCustomerAddress(_addressId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // TODO: Update this to use the correct MedusaJS v2 address API
      console.log('[MedusaCustomerService] Delete address placeholder for MedusaJS v2')
      return { 
        success: false, 
        error: 'Address API needs to be updated for MedusaJS v2' 
      }
    } catch (error: unknown) {
      console.error('[MedusaCustomerService] Delete address error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete address' 
      }
    }
  }

  /**
   * Get customer orders
   * Note: This is a placeholder implementation for MedusaJS v2
   */
  static async getCustomerOrders(_limit: number = 10, _offset: number = 0): Promise<MedusaOrder[]> {
    try {
      // TODO: Update this to use the correct MedusaJS v2 orders API
      console.log('[MedusaCustomerService] Get orders placeholder for MedusaJS v2')
      return []
    } catch (error: unknown) {
      console.error('[MedusaCustomerService] Get orders error:', error)
      return []
    }
  }

  /**
   * Find customer by email or create new one
   * Note: This is a placeholder implementation for MedusaJS v2
   */
  static async findOrCreateCustomer(_email: string): Promise<MedusaCustomer | null> {
    try {
      // TODO: Update this to use the correct MedusaJS v2 API
      console.log('[MedusaCustomerService] Find or create customer placeholder for MedusaJS v2')
      return null
    } catch (error: unknown) {
      console.error('[MedusaCustomerService] Find or create customer error:', error)
      return null
    }
  }

  /**
   * Handle OAuth customer creation/update
   * Note: This is a placeholder implementation for MedusaJS v2
   */
  static async handleOAuthCustomer(_data: {
    email: string
    first_name?: string
    last_name?: string
    provider: string
    provider_id: string
  }): Promise<{ 
    success: boolean
    customer?: MedusaCustomer
    isNew?: boolean
    error?: string 
  }> {
    try {
      // TODO: Update this to use the correct MedusaJS v2 OAuth API
      console.log('[MedusaCustomerService] OAuth customer placeholder for MedusaJS v2')
      return { 
        success: false, 
        error: 'OAuth API needs to be updated for MedusaJS v2' 
      }
    } catch (error: unknown) {
      console.error('[MedusaCustomerService] OAuth customer error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to handle OAuth customer' 
      }
    }
  }
}