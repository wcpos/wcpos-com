import { setRequestLocale } from 'next-intl/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getLicenseStats } from '@/services/core/business/admin-stats'
import {
  getProPluginReleases,
  type ProPluginRelease,
} from '@/services/core/business/pro-downloads'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getStatusColorClasses, maskLicenseKey } from '@/lib/license-display'
import { formatDateForLocale } from '@/lib/date-format'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  )
}

function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-destructive">{message}</CardContent>
    </Card>
  )
}

async function LicenseStatsSection() {
  let stats
  try {
    stats = await getLicenseStats()
  } catch {
    return (
      <ErrorCard
        title="License stats"
        message="Failed to load license stats from the license server."
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total licenses" value={stats.totalLicenses} />
        <StatCard label="Active" value={stats.byStatus.active ?? 0} />
        <StatCard label="Expired" value={stats.byStatus.expired ?? 0} />
        <StatCard label="Suspended" value={stats.byStatus.suspended ?? 0} />
        <StatCard label="Activated machines" value={stats.totalMachines} />
      </div>
      {stats.truncated && (
        <p className="text-xs text-muted-foreground">
          Counts are lower bounds — pagination cap reached while aggregating.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent licenses</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentLicenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No licenses yet.</p>
          ) : (
            <ul className="space-y-2">
              {stats.recentLicenses.map((license) => (
                <li
                  key={license.id}
                  className="flex items-center justify-between text-sm"
                >
                  <code className="font-mono">
                    {maskLicenseKey(license.key)}
                  </code>
                  <span
                    className={`rounded px-2 py-1 text-xs font-medium capitalize ${getStatusColorClasses(license.displayStatus)}`}
                  >
                    {license.displayStatus}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDateForLocale(license.createdAt, 'en')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

async function LatestReleaseSection() {
  let latest: ProPluginRelease | undefined
  try {
    const releases = await getProPluginReleases()
    latest = releases[0]
  } catch {
    return (
      <ErrorCard
        title="Latest Pro release"
        message="Failed to load releases from GitHub."
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Latest Pro release</CardTitle>
      </CardHeader>
      <CardContent>
        {latest ? (
          <div className="space-y-1 text-sm">
            <p className="text-2xl font-bold">v{latest.version}</p>
            <p className="text-muted-foreground">
              Published {formatDateForLocale(latest.publishedAt, 'en')}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No releases found.</p>
        )}
      </CardContent>
    </Card>
  )
}

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requireAdmin()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <LicenseStatsSection />
      <LatestReleaseSection />
    </div>
  )
}
