import { AdminHeader } from '@/components/admin/header'
import { LogsService } from '@/services/core/logs/logs-service'
import { LogsTable } from '../logs/logs-table'

interface ErrorsPageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    platform?: string
  }>
}

export default async function ErrorsPage({ searchParams }: ErrorsPageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const search = params.search || ''
  const platform = params.platform || ''

  const [logsData, platforms] = await Promise.all([
    LogsService.getLogs(page, 50, {
      search: search || undefined,
      platform: platform || undefined,
      level: 'error',
    }),
    LogsService.getUniquePlatforms(),
  ])

  return (
    <div className="flex flex-col">
      <AdminHeader
        title="Error Logs"
        description="View and investigate API errors"
      />

      <div className="flex-1 p-6">
        <LogsTable
          logs={logsData.logs}
          total={logsData.total}
          page={logsData.page}
          pageSize={logsData.pageSize}
          totalPages={logsData.totalPages}
          platforms={platforms}
          currentFilters={{ search, platform, level: 'error' }}
        />
      </div>
    </div>
  )
}

