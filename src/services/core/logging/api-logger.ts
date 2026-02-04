import 'server-only'

export interface LogContext {
  endpoint: string
  method: string
  platform?: string
  appVersion?: string
  licenseKey?: string
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
 * Database has been removed. Currently logs to console only.
 * Will be rebuilt to use an external logging service.
 */
export class ApiLogger {
  static async log(context: LogContext): Promise<void> {
    console.log('[ApiLogger]', JSON.stringify(context))
  }

  static async info(
    endpoint: string,
    method: string,
    context: Partial<LogContext> = {}
  ): Promise<void> {
    await this.log({ endpoint, method, level: 'info', ...context })
  }

  static async warn(
    endpoint: string,
    method: string,
    context: Partial<LogContext> = {}
  ): Promise<void> {
    await this.log({ endpoint, method, level: 'warn', ...context })
  }

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
