import 'server-only'

export interface ApiLog {
  id: string
  endpoint: string
  level: 'info' | 'warn' | 'error' | 'debug'
  platform: string | null
  instance: string | null
  appVersion: string | null
  errorMessage: string | null
  createdAt: Date
}

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
 * Provides access to API logs for the admin dashboard.
 * Currently stubbed out -- database has been removed.
 * Will be rebuilt to query an external logging source.
 */
export class LogsService {
  static async getLogs(
    page: number = 1,
    pageSize: number = 50,
    _filters: LogsFilter = {}
  ): Promise<PaginatedLogs> {
    return {
      logs: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    }
  }

  static async getLogById(_id: string): Promise<ApiLog | null> {
    return null
  }

  static async getUniquePlatforms(): Promise<string[]> {
    return []
  }
}
