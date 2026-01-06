import 'server-only'

import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '../database/connection'
import { users, type User, type NewUser } from '../database/schema'
import { SessionService } from './session-service'

/**
 * Authentication service for user management
 */
export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: {
    email: string
    password: string
    firstName?: string
    lastName?: string
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!db) {
      return { success: false, error: 'Database not available' }
    }

    try {
      // Check if user exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email.toLowerCase()))
        .limit(1)

      if (existingUser.length > 0) {
        return { success: false, error: 'Email already registered' }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 12)

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          email: data.email.toLowerCase(),
          password: hashedPassword,
          firstName: data.firstName || null,
          lastName: data.lastName || null,
          status: 'active',
          emailVerified: false,
        } as NewUser)
        .returning()

      return { success: true, user: newUser }
    } catch (error) {
      console.error('[AuthService] Registration error:', error)
      return { success: false, error: 'Failed to create account' }
    }
  }

  /**
   * Login with email and password
   */
  static async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!db) {
      return { success: false, error: 'Database not available' }
    }

    try {
      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1)

      if (!user) {
        return { success: false, error: 'Invalid email or password' }
      }

      if (!user.password) {
        return {
          success: false,
          error: 'Please use OAuth login for this account',
        }
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password)
      if (!isValid) {
        return { success: false, error: 'Invalid email or password' }
      }

      // Check account status
      if (user.status === 'suspended') {
        return { success: false, error: 'Account is suspended' }
      }

      // Update last login
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id))

      // Create session
      await SessionService.createSession(user)

      return { success: true, user }
    } catch (error) {
      console.error('[AuthService] Login error:', error)
      return { success: false, error: 'Login failed' }
    }
  }

  /**
   * Logout current user
   */
  static async logout(): Promise<void> {
    await SessionService.destroySession()
  }

  /**
   * Get current user from session
   */
  static async getCurrentUser(): Promise<User | null> {
    if (!db) {
      return null
    }

    const session = await SessionService.getSession()
    if (!session) {
      return null
    }

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1)

      return user || null
    } catch (error) {
      console.error('[AuthService] Failed to get current user:', error)
      return null
    }
  }

  /**
   * Find or create user from OAuth provider
   */
  static async findOrCreateOAuthUser(data: {
    email: string
    firstName?: string
    lastName?: string
    avatar?: string
    provider: 'google' | 'github'
    providerId: string
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!db) {
      return { success: false, error: 'Database not available' }
    }

    try {
      // Check if user exists by provider ID
      const providerField =
        data.provider === 'google' ? users.googleId : users.githubId
      let [user] = await db
        .select()
        .from(users)
        .where(eq(providerField, data.providerId))
        .limit(1)

      if (user) {
        // Update last login
        await db
          .update(users)
          .set({ lastLoginAt: new Date() })
          .where(eq(users.id, user.id))

        await SessionService.createSession(user)
        return { success: true, user }
      }

      // Check if user exists by email
      ;[user] = await db
        .select()
        .from(users)
        .where(eq(users.email, data.email.toLowerCase()))
        .limit(1)

      if (user) {
        // Link OAuth provider to existing account
        const updateData =
          data.provider === 'google'
            ? { googleId: data.providerId, lastLoginAt: new Date() }
            : { githubId: data.providerId, lastLoginAt: new Date() }

        await db.update(users).set(updateData).where(eq(users.id, user.id))

        await SessionService.createSession(user)
        return { success: true, user }
      }

      // Create new user
      const newUserData: NewUser = {
        email: data.email.toLowerCase(),
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        avatar: data.avatar || null,
        status: 'active',
        emailVerified: true, // OAuth emails are considered verified
        ...(data.provider === 'google'
          ? { googleId: data.providerId }
          : { githubId: data.providerId }),
      }

      const [newUser] = await db.insert(users).values(newUserData).returning()

      await SessionService.createSession(newUser)
      return { success: true, user: newUser }
    } catch (error) {
      console.error('[AuthService] OAuth error:', error)
      return { success: false, error: 'OAuth authentication failed' }
    }
  }
}

