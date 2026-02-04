import 'server-only'

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
 * Provides aggregated data for the admin dashboard.
 * Currently stubbed out -- database has been removed.
 * Will be rebuilt to query Medusa or an external analytics source.
 */
export class AnalyticsService {
  static async getDashboardStats(): Promise<DashboardStats> {
    return {
      totalRequests: 0,
      totalErrors: 0,
      uniqueUsers: 0,
      activeToday: 0,
      requestsTrend: 0,
      errorsTrend: 0,
    }
  }

  static async getPlatformBreakdown(): Promise<PlatformBreakdown[]> {
    return []
  }

  static async getVersionBreakdown(): Promise<VersionBreakdown[]> {
    return []
  }

  static async getRequestsOverTime(): Promise<RequestsOverTime[]> {
    return []
  }

  static async getRecentErrors(_limit: number = 10): Promise<RecentError[]> {
    return []
  }

  static async getTotalUsers(): Promise<number> {
    return 0
  }
}
