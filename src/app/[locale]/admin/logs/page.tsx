import { setRequestLocale } from 'next-intl/server'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin-auth'
import {
  LOG_LEVELS,
  queryLogs,
  type ApiLog,
  type LogLevel,
} from '@/services/core/logs/logs-service'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatDateForLocale } from '@/lib/date-format'

function parseLevel(value: string | undefined): LogLevel | undefined {
  return (LOG_LEVELS as readonly string[]).includes(value ?? '')
    ? (value as LogLevel)
    : undefined
}

function levelBadgeClasses(level: ApiLog['level']): string {
  switch (level) {
    case 'debug':
      return 'text-gray-600 bg-gray-50'
    case 'info':
      return 'text-blue-600 bg-blue-50'
    case 'warning':
      return 'text-yellow-600 bg-yellow-50'
    case 'error':
      return 'text-red-600 bg-red-50'
    case 'fatal':
      return 'text-red-50 bg-red-600'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

function LevelFilter({ active }: { active: LogLevel | undefined }) {
  const options: Array<{ label: string; value: LogLevel | undefined }> = [
    { label: 'All', value: undefined },
    ...LOG_LEVELS.map((level) => ({ label: level, value: level as LogLevel })),
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Link
          key={option.label}
          href={
            option.value ? `/admin/logs?level=${option.value}` : '/admin/logs'
          }
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors',
            active === option.value
              ? 'bg-gray-900 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  )
}

function StateCard({ title, detail }: { title: string; detail: string }) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-sm">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

function LogsTable({ logs }: { logs: ApiLog[] }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Time</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatDateForLocale(log.createdAt, 'en', {
                    dateStyle: 'medium',
                    timeStyle: 'medium',
                  })}
                </TableCell>
                <TableCell>
                  <span
                    className={`rounded px-2 py-1 text-xs font-medium ${levelBadgeClasses(log.level)}`}
                  >
                    {log.level}
                  </span>
                </TableCell>
                <TableCell className="text-xs">{log.category ?? '—'}</TableCell>
                <TableCell className="text-xs">{log.source}</TableCell>
                <TableCell className="max-w-md break-words text-xs">
                  {log.message}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default async function AdminLogsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ level?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  const { level: levelParam } = await searchParams
  const level = parseLevel(levelParam)

  const result = await queryLogs({ level })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Logs</h1>
        <span className="text-sm text-muted-foreground">Last hour</span>
      </div>

      <LevelFilter active={level} />

      {result.status === 'unconfigured' && (
        <StateCard
          title="Logs querying not configured"
          detail="Set LOKI_URL (and LOKI_API_KEY if required) to enable the logs viewer."
        />
      )}

      {result.status === 'error' && (
        <StateCard
          title="Failed to query logs"
          detail={result.message}
        />
      )}

      {result.status === 'ok' &&
        (result.logs.length === 0 ? (
          <StateCard
            title="No logs found"
            detail={`No ${level ?? ''}${level ? ' ' : ''}logs in the last hour.`}
          />
        ) : (
          <LogsTable logs={result.logs} />
        ))}
    </div>
  )
}
