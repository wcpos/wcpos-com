import 'server-only'

import { desc, eq, like, count, or } from 'drizzle-orm'
import { db, isDatabaseAvailable } from '../database/connection'
import { users, type User } from '../database/schema'

export interface PaginatedUsers {
  users: User[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Users Service
 *
 * Provides user management functionality for the admin dashboard
 */
export class UsersService {
  /**
   * Get paginated users
   */
  static async getUsers(
    page: number = 1,
    pageSize: number = 50,
    search?: string
  ): Promise<PaginatedUsers> {
    if (!isDatabaseAvailable() || !db) {
      return {
        users: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      }
    }

    try {
      const offset = (page - 1) * pageSize
      const whereClause = search
        ? or(
            like(users.email, `%${search}%`),
            like(users.firstName, `%${search}%`),
            like(users.lastName, `%${search}%`)
          )
        : undefined

      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(users)
        .where(whereClause)

      const total = countResult?.count || 0

      // Get users
      const userList = await db
        .select()
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(pageSize)
        .offset(offset)

      return {
        users: userList,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      }
    } catch (error) {
      console.error('[UsersService] Failed to get users:', error)
      return {
        users: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      }
    }
  }

  /**
   * Get a user by ID
   */
  static async getUserById(id: string): Promise<User | null> {
    if (!isDatabaseAvailable() || !db) {
      return null
    }

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1)

      return user || null
    } catch (error) {
      console.error('[UsersService] Failed to get user:', error)
      return null
    }
  }

  /**
   * Update user role
   */
  static async updateUserRole(
    id: string,
    role: 'user' | 'admin'
  ): Promise<boolean> {
    if (!isDatabaseAvailable() || !db) {
      return false
    }

    try {
      await db
        .update(users)
        .set({ role, updatedAt: new Date() })
        .where(eq(users.id, id))

      return true
    } catch (error) {
      console.error('[UsersService] Failed to update user role:', error)
      return false
    }
  }

  /**
   * Update user status
   */
  static async updateUserStatus(
    id: string,
    status: 'pending' | 'active' | 'suspended'
  ): Promise<boolean> {
    if (!isDatabaseAvailable() || !db) {
      return false
    }

    try {
      await db
        .update(users)
        .set({ status, updatedAt: new Date() })
        .where(eq(users.id, id))

      return true
    } catch (error) {
      console.error('[UsersService] Failed to update user status:', error)
      return false
    }
  }
}

