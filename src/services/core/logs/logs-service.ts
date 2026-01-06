import 'server-only'

import { desc, eq, like, and, or, count, gte, lte } from 'drizzle-orm'
import { db, isDatabaseAvailable } from '../database/connection'
import { apiLogs, type ApiLog } from '../database/schema'

export interface LogsFilter {
  endpoint?: string
  platform?: string
  level?: 'info' | 'warn' | 'error' | 'debug'
  search?: string
  startDate?: Date
  endDate?: Date
}

export interface PaginatedLogs {
  logs: ApiLog[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Logs Service
 *
 * Provides access to API logs for the admin dashboard
 */
export class LogsService {
  /**
   * Get paginated logs with optional filters
   */
  static async getLogs(
    page: number = 1,
    pageSize: number = 50,
    filters: LogsFilter = {}
  ): Promise<PaginatedLogs> {
    if (!isDatabaseAvailable() || !db) {
      return {
        logs: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      }
    }

    try {
      const offset = (page - 1) * pageSize
      const conditions = []

      if (filters.endpoint) {
        conditions.push(like(apiLogs.endpoint, `%${filters.endpoint}%`))
      }

      if (filters.platform) {
        conditions.push(eq(apiLogs.platform, filters.platform))
      }

      if (filters.level) {
        conditions.push(eq(apiLogs.level, filters.level))
      }

      if (filters.startDate) {
        conditions.push(gte(apiLogs.createdAt, filters.startDate))
      }

      if (filters.endDate) {
        conditions.push(lte(apiLogs.createdAt, filters.endDate))
      }

      if (filters.search) {
        conditions.push(
          or(
            like(apiLogs.endpoint, `%${filters.search}%`),
            like(apiLogs.instance, `%${filters.search}%`),
            like(apiLogs.errorMessage, `%${filters.search}%`)
          )
        )
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined

      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(apiLogs)
        .where(whereClause)

      const total = countResult?.count || 0

      // Get logs
      const logs = await db
        .select()
        .from(apiLogs)
        .where(whereClause)
        .orderBy(desc(apiLogs.createdAt))
        .limit(pageSize)
        .offset(offset)

      return {
        logs,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      }
    } catch (error) {
      console.error('[LogsService] Failed to get logs:', error)
      return {
        logs: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      }
    }
  }

  /**
   * Get a single log by ID
   */
  static async getLogById(id: string): Promise<ApiLog | null> {
    if (!isDatabaseAvailable() || !db) {
      return null
    }

    try {
      const [log] = await db
        .select()
        .from(apiLogs)
        .where(eq(apiLogs.id, id))
        .limit(1)

      return log || null
    } catch (error) {
      console.error('[LogsService] Failed to get log:', error)
      return null
    }
  }

  /**
   * Get unique platforms for filtering
   */
  static async getUniquePlatforms(): Promise<string[]> {
    if (!isDatabaseAvailable() || !db) {
      return []
    }

    try {
      const results = await db
        .selectDistinct({ platform: apiLogs.platform })
        .from(apiLogs)

      return results
        .map((r) => r.platform)
        .filter((p): p is string => p !== null)
    } catch (error) {
      console.error('[LogsService] Failed to get platforms:', error)
      return []
    }
  }
}

