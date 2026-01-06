import { Activity, AlertCircle, Users, Zap } from 'lucide-react'
import { AdminHeader } from '@/components/admin/header'
import { StatCard } from '@/components/admin/stat-card'
import { RequestsChart } from '@/components/admin/charts/requests-chart'
import { PlatformChart } from '@/components/admin/charts/platform-chart'
import { VersionChart } from '@/components/admin/charts/version-chart'
import { RecentErrors } from '@/components/admin/recent-errors'
import { AnalyticsService } from '@/services/core/analytics/analytics-service'

export default async function AdminDashboard() {
  // Fetch all data in parallel
  const [stats, platformData, versionData, requestsData, recentErrors] =
    await Promise.all([
      AnalyticsService.getDashboardStats(),
      AnalyticsService.getPlatformBreakdown(),
      AnalyticsService.getVersionBreakdown(),
      AnalyticsService.getRequestsOverTime(),
      AnalyticsService.getRecentErrors(5),
    ])

  return (
    <div className="flex flex-col">
      <AdminHeader
        title="Dashboard"
        description="Overview of your application metrics"
      />

      <div className="flex-1 space-y-6 p-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Requests"
            value={stats.totalRequests.toLocaleString()}
            description="from last week"
            icon={Activity}
            trend={{
              value: stats.requestsTrend,
              isPositive: stats.requestsTrend >= 0,
            }}
          />
          <StatCard
            title="Errors"
            value={stats.totalErrors}
            description="from last week"
            icon={AlertCircle}
            trend={{
              value: stats.errorsTrend,
              isPositive: stats.errorsTrend <= 0,
            }}
          />
          <StatCard
            title="Unique Users"
            value={stats.uniqueUsers}
            description="today"
            icon={Users}
          />
          <StatCard
            title="Active Today"
            value={stats.activeToday}
            description="requests"
            icon={Zap}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-4">
          <RequestsChart data={requestsData} />
        </div>

        {/* Distribution Charts */}
        <div className="grid gap-4 md:grid-cols-4">
          <PlatformChart data={platformData} />
          <VersionChart data={versionData} />
        </div>

        {/* Recent Errors */}
        <div className="grid gap-4 md:grid-cols-4">
          <RecentErrors errors={recentErrors} />
        </div>
      </div>
    </div>
  )
}

