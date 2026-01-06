import 'server-only'

import { db, isDatabaseAvailable } from '../database/connection'
import { apiLogs, type NewApiLog } from '../database/schema'
import { hashString } from '@/lib/utils'

export interface LogContext {
  endpoint: string
  method: string
  platform?: string
  appVersion?: string
  licenseKey?: string // Will be hashed before storage
  instance?: string
  statusCode?: number
  responseTime?: number
  level?: 'info' | 'warn' | 'error' | 'debug'
  errorMessage?: string
  errorStack?: string
  ipAddress?: string
  userAgent?: string
  country?: string
  metadata?: Record<string, unknown>
}

/**
 * API Logger for tracking all API requests
 *
 * Logs are stored in the database for analytics and debugging.
 * Sensitive data like license keys are hashed before storage.
 */
export class ApiLogger {
  /**
   * Log an API request
   */
  static async log(context: LogContext): Promise<void> {
    if (!isDatabaseAvailable() || !db) {
      // Fallback to console logging if database is not available
      console.log('[ApiLogger]', JSON.stringify(context))
      return
    }

    try {
      const logEntry: NewApiLog = {
        endpoint: context.endpoint,
        method: context.method,
        platform: context.platform || null,
        appVersion: context.appVersion || null,
        licenseKeyHash: context.licenseKey
          ? await hashString(context.licenseKey)
          : null,
        instance: context.instance || null,
        statusCode: context.statusCode || null,
        responseTime: context.responseTime || null,
        level: context.level || 'info',
        errorMessage: context.errorMessage || null,
        errorStack: context.errorStack || null,
        ipAddress: context.ipAddress || null,
        userAgent: context.userAgent || null,
        country: context.country || null,
        metadata: context.metadata ? JSON.stringify(context.metadata) : null,
      }

      await db.insert(apiLogs).values(logEntry)
    } catch (error) {
      // Don't throw - logging should never break the request
      console.error('[ApiLogger] Failed to log:', error)
    }
  }

  /**
   * Log an info event
   */
  static async info(
    endpoint: string,
    method: string,
    context: Partial<LogContext> = {}
  ): Promise<void> {
    await this.log({ endpoint, method, level: 'info', ...context })
  }

  /**
   * Log a warning event
   */
  static async warn(
    endpoint: string,
    method: string,
    context: Partial<LogContext> = {}
  ): Promise<void> {
    await this.log({ endpoint, method, level: 'warn', ...context })
  }

  /**
   * Log an error event
   */
  static async error(
    endpoint: string,
    method: string,
    error: Error | string,
    context: Partial<LogContext> = {}
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : error
    const errorStack = error instanceof Error ? error.stack : undefined

    await this.log({
      endpoint,
      method,
      level: 'error',
      errorMessage,
      errorStack,
      ...context,
    })
  }

  /**
   * Create a request logger that tracks timing
   */
  static createRequestLogger(
    endpoint: string,
    method: string,
    context: Partial<LogContext> = {}
  ) {
    const startTime = Date.now()

    return {
      success: async (statusCode: number = 200) => {
        const responseTime = Date.now() - startTime
        await this.info(endpoint, method, {
          ...context,
          statusCode,
          responseTime,
        })
      },
      error: async (error: Error | string, statusCode: number = 500) => {
        const responseTime = Date.now() - startTime
        await this.error(endpoint, method, error, {
          ...context,
          statusCode,
          responseTime,
        })
      },
    }
  }
}

