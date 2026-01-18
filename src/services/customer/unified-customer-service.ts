import 'server-only'

import { eq } from 'drizzle-orm'
import { db } from '../core/database/connection'
import { users, type User, type NewUser } from '../core/database/schema'
import { MedusaCustomerService, type MedusaCustomer } from '../medusa/customer-service-v2'
import { SessionService } from '../core/auth/session-service'

/**
 * Unified Customer Service
 * 
 * This service manages the integration between wcpos-com user accounts
 * and MedusaJS customers, providing a single interface for customer operations.
 */

export interface UnifiedCustomer extends User {
  medusaCustomer?: MedusaCustomer
}

export class UnifiedCustomerService {
  /**
   * Register a new customer (creates both wcpos-com user and MedusaJS customer)
   */
  static async registerCustomer(data: {
    email: string
    password?: string
    firstName?: string
    lastName?: string
    phone?: string
  }): Promise<{ success: boolean; user?: UnifiedCustomer; error?: string }> {
    if (!db) {
      return { success: false, error: 'Database not available' }
    }

    try {
      // 1. Check if user already exists in wcpos-com
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email.toLowerCase()))
        .limit(1)

      if (existingUser.length > 0) {
        return { success: false, error: 'Email already registered' }
      }

      // 2. Create customer in MedusaJS first
      const medusaResult = await MedusaCustomerService.createCustomer({
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
        password: data.password || '',
      })

      if (!medusaResult.success) {
        return { success: false, error: medusaResult.error }
      }

      // 3. Create wcpos-com user record with reference to MedusaJS customer
      const [newUser] = await db
        .insert(users)
        .values({
          email: data.email.toLowerCase(),
          medusaCustomerId: medusaResult.customer!.id,
          status: 'active',
          emailVerified: true, // MedusaJS handles email verification
        } as NewUser)
        .returning()

      // 4. Create session
      await SessionService.createSession(newUser)

      return { 
        success: true, 
        user: { 
          ...newUser, 
          medusaCustomer: medusaResult.customer 
        } 
      }
    } catch (error) {
      console.error('[UnifiedCustomerService] Registration error:', error)
      return { success: false, error: 'Failed to create account' }
    }
  }

  /**
   * Login customer (authenticates with MedusaJS and creates wcpos-com session)
   */
  static async loginCustomer(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: UnifiedCustomer; error?: string }> {
    if (!db) {
      return { success: false, error: 'Database not available' }
    }

    try {
      // 1. Authenticate with MedusaJS
      const medusaAuth = await MedusaCustomerService.authenticateCustomer(email, password)
      
      if (!medusaAuth.success) {
        return { success: false, error: medusaAuth.error }
      }

      // 2. Find or create wcpos-com user record
      let wcposUser = await db
        .select()
        .from(users)
        .where(eq(users.medusaCustomerId, medusaAuth.customer!.id))
        .limit(1)

      if (!wcposUser[0]) {
        // Create wcpos-com user if it doesn't exist
        const [newUser] = await db
          .insert(users)
          .values({
            email: email.toLowerCase(),
            medusaCustomerId: medusaAuth.customer!.id,
            status: 'active',
            emailVerified: true,
          } as NewUser)
          .returning()
        
        wcposUser = [newUser]
      }

      // 3. Update last login
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, wcposUser[0].id))

      // 4. Create session
      await SessionService.createSession(wcposUser[0])

      return { 
        success: true, 
        user: { 
          ...wcposUser[0], 
          medusaCustomer: medusaAuth.customer 
        } 
      }
    } catch (error) {
      console.error('[UnifiedCustomerService] Login error:', error)
      return { success: false, error: 'Login failed' }
    }
  }

  /**
   * Handle OAuth login (Google, GitHub, etc.)
   */
  static async handleOAuthLogin(oauthData: {
    email: string
    firstName?: string
    lastName?: string
    provider: 'google' | 'github'
    providerId: string
  }): Promise<{ success: boolean; user?: UnifiedCustomer; error?: string }> {
    if (!db) {
      return { success: false, error: 'Database not available' }
    }

    try {
      // 1. Handle OAuth customer in MedusaJS
      const medusaResult = await MedusaCustomerService.handleOAuthCustomer({
        email: oauthData.email,
        first_name: oauthData.firstName,
        last_name: oauthData.lastName,
        provider: oauthData.provider,
        provider_id: oauthData.providerId,
      })

      if (!medusaResult.success) {
        return { success: false, error: medusaResult.error }
      }

      // 2. Find or create wcpos-com user record
      let wcposUser = await db
        .select()
        .from(users)
        .where(eq(users.medusaCustomerId, medusaResult.customer!.id))
        .limit(1)

      if (!wcposUser[0]) {
        // Create wcpos-com user
        const [newUser] = await db
          .insert(users)
          .values({
            email: oauthData.email.toLowerCase(),
            medusaCustomerId: medusaResult.customer!.id,
            googleId: oauthData.provider === 'google' ? oauthData.providerId : null,
            githubId: oauthData.provider === 'github' ? oauthData.providerId : null,
            status: 'active',
            emailVerified: true,
          } as NewUser)
          .returning()
        
        wcposUser = [newUser]
      } else {
        // Update OAuth ID if not already set
        const updateData: Partial<NewUser> = { lastLoginAt: new Date() }
        if (oauthData.provider === 'google' && !wcposUser[0].googleId) {
          updateData.googleId = oauthData.providerId
        } else if (oauthData.provider === 'github' && !wcposUser[0].githubId) {
          updateData.githubId = oauthData.providerId
        }

        await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, wcposUser[0].id))
      }

      // 3. Create session
      await SessionService.createSession(wcposUser[0])

      return { 
        success: true, 
        user: { 
          ...wcposUser[0], 
          medusaCustomer: medusaResult.customer 
        } 
      }
    } catch (error) {
      console.error('[UnifiedCustomerService] OAuth error:', error)
      return { success: false, error: 'OAuth authentication failed' }
    }
  }

  /**
   * Get current customer with full MedusaJS data
   */
  static async getCurrentCustomer(): Promise<UnifiedCustomer | null> {
    if (!db) {
      return null
    }

    const session = await SessionService.getSession()
    if (!session) {
      return null
    }

    try {
      // Get wcpos-com user
      const [wcposUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1)

      if (!wcposUser || !wcposUser.medusaCustomerId) {
        return null
      }

      // Get MedusaJS customer data
      const medusaCustomer = await MedusaCustomerService.getCustomerByEmail(
        wcposUser.email
      )

      return {
        ...wcposUser,
        medusaCustomer: medusaCustomer || undefined,
      }
    } catch (error) {
      console.error('[UnifiedCustomerService] Get current customer error:', error)
      return null
    }
  }

  /**
   * Update customer profile (updates both systems)
   */
  static async updateCustomerProfile(
    userId: string,
    data: {
      firstName?: string
      lastName?: string
      phone?: string
    }
  ): Promise<{ success: boolean; user?: UnifiedCustomer; error?: string }> {
    if (!db) {
      return { success: false, error: 'Database not available' }
    }

    try {
      // Get wcpos-com user
      const [wcposUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      if (!wcposUser || !wcposUser.medusaCustomerId) {
        return { success: false, error: 'Customer not found' }
      }

      // Update MedusaJS customer
      const medusaResult = await MedusaCustomerService.updateCustomer({
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
      })

      if (!medusaResult.success) {
        return { success: false, error: medusaResult.error }
      }

      // Update wcpos-com user timestamp
      await db
        .update(users)
        .set({ updatedAt: new Date() })
        .where(eq(users.id, userId))

      return { 
        success: true, 
        user: { 
          ...wcposUser, 
          medusaCustomer: medusaResult.customer 
        } 
      }
    } catch (error) {
      console.error('[UnifiedCustomerService] Update profile error:', error)
      return { success: false, error: 'Failed to update profile' }
    }
  }

  /**
   * Get customer orders from MedusaJS
   */
  static async getCustomerOrders(userId: string, limit = 10, offset = 0) {
    if (!db) {
      return []
    }

    try {
      const [wcposUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      if (!wcposUser || !wcposUser.medusaCustomerId) {
        return []
      }

      return await MedusaCustomerService.getCustomerOrders(limit, offset)
    } catch (error) {
      console.error('[UnifiedCustomerService] Get orders error:', error)
      return []
    }
  }

  /**
   * Get customer licenses from order metadata
   */
  static async getCustomerLicenses(userId: string) {
    const orders = await this.getCustomerOrders(userId, 100) // Get more orders to find licenses
    
    const licenses: Array<{
      key: string
      id: string
      product: string
      orderId: string
      orderDate: string
    }> = []

    for (const order of orders) {
      if (order.metadata?.licenses) {
        const orderLicenses = order.metadata.licenses as Array<{
          key: string
          id: string
          product: string
        }>
        
        for (const license of orderLicenses) {
          licenses.push({
            ...license,
            orderId: order.id,
            orderDate: order.created_at,
          })
        }
      }
    }

    return licenses
  }
}