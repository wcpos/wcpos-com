import { AdminHeader } from '@/components/admin/header'
import { LogsService } from '@/services/core/logs/logs-service'
import { LogsTable } from './logs-table'

interface LogsPageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    platform?: string
    level?: string
  }>
}

export default async function LogsPage({ searchParams }: LogsPageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const search = params.search || ''
  const platform = params.platform || ''
  const level = params.level as 'info' | 'warn' | 'error' | 'debug' | undefined

  const [logsData, platforms] = await Promise.all([
    LogsService.getLogs(page, 50, {
      search: search || undefined,
      platform: platform || undefined,
      level,
    }),
    LogsService.getUniquePlatforms(),
  ])

  return (
    <div className="flex flex-col">
      <AdminHeader
        title="API Logs"
        description="View and search all API requests"
      />

      <div className="flex-1 p-6">
        <LogsTable
          logs={logsData.logs}
          total={logsData.total}
          page={logsData.page}
          pageSize={logsData.pageSize}
          totalPages={logsData.totalPages}
          platforms={platforms}
          currentFilters={{ search, platform, level }}
        />
      </div>
    </div>
  )
}

