import 'server-only'

import { sql, count, desc, eq, gte, and } from 'drizzle-orm'
import { db, isDatabaseAvailable } from '../database/connection'
import { apiLogs, users } from '../database/schema'

export interface DashboardStats {
  totalRequests: number
  totalErrors: number
  uniqueUsers: number
  activeToday: number
  requestsTrend: number
  errorsTrend: number
}

export interface PlatformBreakdown {
  platform: string
  count: number
}

export interface VersionBreakdown {
  version: string
  count: number
}

export interface RequestsOverTime {
  date: string
  requests: number
  errors: number
}

export interface RecentError {
  id: string
  endpoint: string
  errorMessage: string | null
  platform: string | null
  appVersion: string | null
  createdAt: Date
}

/**
 * Analytics Service
 *
 * Provides aggregated data for the admin dashboard
 */
export class AnalyticsService {
  /**
   * Get dashboard overview stats
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    if (!isDatabaseAvailable() || !db) {
      return {
        totalRequests: 0,
        totalErrors: 0,
        uniqueUsers: 0,
        activeToday: 0,
        requestsTrend: 0,
        errorsTrend: 0,
      }
    }

    try {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)

      // Total requests this week
      const [totalRequestsResult] = await db
        .select({ count: count() })
        .from(apiLogs)
        .where(gte(apiLogs.createdAt, lastWeek))

      // Total errors this week
      const [totalErrorsResult] = await db
        .select({ count: count() })
        .from(apiLogs)
        .where(and(gte(apiLogs.createdAt, lastWeek), eq(apiLogs.level, 'error')))

      // Unique instances today
      const uniqueUsersResult = await db
        .selectDistinct({ instance: apiLogs.instance })
        .from(apiLogs)
        .where(gte(apiLogs.createdAt, today))

      // Active today (requests)
      const [activeTodayResult] = await db
        .select({ count: count() })
        .from(apiLogs)
        .where(gte(apiLogs.createdAt, today))

      // Previous week stats for trend calculation
      const [prevWeekRequestsResult] = await db
        .select({ count: count() })
        .from(apiLogs)
        .where(
          and(gte(apiLogs.createdAt, twoWeeksAgo), sql`${apiLogs.createdAt} < ${lastWeek}`)
        )

      const [prevWeekErrorsResult] = await db
        .select({ count: count() })
        .from(apiLogs)
        .where(
          and(
            gte(apiLogs.createdAt, twoWeeksAgo),
            sql`${apiLogs.createdAt} < ${lastWeek}`,
            eq(apiLogs.level, 'error')
          )
        )

      const totalRequests = totalRequestsResult?.count || 0
      const prevRequests = prevWeekRequestsResult?.count || 1
      const totalErrors = totalErrorsResult?.count || 0
      const prevErrors = prevWeekErrorsResult?.count || 1

      return {
        totalRequests,
        totalErrors,
        uniqueUsers: uniqueUsersResult.length,
        activeToday: activeTodayResult?.count || 0,
        requestsTrend: Math.round(
          ((totalRequests - prevRequests) / prevRequests) * 100
        ),
        errorsTrend: Math.round(
          ((totalErrors - prevErrors) / (prevErrors || 1)) * 100
        ),
      }
    } catch (error) {
      console.error('[AnalyticsService] Failed to get dashboard stats:', error)
      return {
        totalRequests: 0,
        totalErrors: 0,
        uniqueUsers: 0,
        activeToday: 0,
        requestsTrend: 0,
        errorsTrend: 0,
      }
    }
  }

  /**
   * Get platform breakdown
   */
  static async getPlatformBreakdown(): Promise<PlatformBreakdown[]> {
    if (!isDatabaseAvailable() || !db) {
      return []
    }

    try {
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      const results = await db
        .select({
          platform: apiLogs.platform,
          count: count(),
        })
        .from(apiLogs)
        .where(gte(apiLogs.createdAt, lastWeek))
        .groupBy(apiLogs.platform)
        .orderBy(desc(count()))

      return results.map((r) => ({
        platform: r.platform || 'unknown',
        count: r.count,
      }))
    } catch (error) {
      console.error('[AnalyticsService] Failed to get platform breakdown:', error)
      return []
    }
  }

  /**
   * Get version breakdown
   */
  static async getVersionBreakdown(): Promise<VersionBreakdown[]> {
    if (!isDatabaseAvailable() || !db) {
      return []
    }

    try {
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      const results = await db
        .select({
          version: apiLogs.appVersion,
          count: count(),
        })
        .from(apiLogs)
        .where(gte(apiLogs.createdAt, lastWeek))
        .groupBy(apiLogs.appVersion)
        .orderBy(desc(count()))
        .limit(10)

      return results.map((r) => ({
        version: r.version || 'unknown',
        count: r.count,
      }))
    } catch (error) {
      console.error('[AnalyticsService] Failed to get version breakdown:', error)
      return []
    }
  }

  /**
   * Get requests over time (last 7 days)
   */
  static async getRequestsOverTime(): Promise<RequestsOverTime[]> {
    if (!isDatabaseAvailable() || !db) {
      return []
    }

    try {
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      const results = await db
        .select({
          date: sql<string>`DATE(${apiLogs.createdAt})`,
          requests: count(),
          errors: sql<number>`COUNT(CASE WHEN ${apiLogs.level} = 'error' THEN 1 END)`,
        })
        .from(apiLogs)
        .where(gte(apiLogs.createdAt, lastWeek))
        .groupBy(sql`DATE(${apiLogs.createdAt})`)
        .orderBy(sql`DATE(${apiLogs.createdAt})`)

      return results.map((r) => ({
        date: r.date,
        requests: r.requests,
        errors: Number(r.errors),
      }))
    } catch (error) {
      console.error('[AnalyticsService] Failed to get requests over time:', error)
      return []
    }
  }

  /**
   * Get recent errors
   */
  static async getRecentErrors(limit: number = 10): Promise<RecentError[]> {
    if (!isDatabaseAvailable() || !db) {
      return []
    }

    try {
      const results = await db
        .select({
          id: apiLogs.id,
          endpoint: apiLogs.endpoint,
          errorMessage: apiLogs.errorMessage,
          platform: apiLogs.platform,
          appVersion: apiLogs.appVersion,
          createdAt: apiLogs.createdAt,
        })
        .from(apiLogs)
        .where(eq(apiLogs.level, 'error'))
        .orderBy(desc(apiLogs.createdAt))
        .limit(limit)

      return results
    } catch (error) {
      console.error('[AnalyticsService] Failed to get recent errors:', error)
      return []
    }
  }

  /**
   * Get total user count
   */
  static async getTotalUsers(): Promise<number> {
    if (!isDatabaseAvailable() || !db) {
      return 0
    }

    try {
      const [result] = await db.select({ count: count() }).from(users)
      return result?.count || 0
    } catch (error) {
      console.error('[AnalyticsService] Failed to get total users:', error)
      return 0
    }
  }
}

