import { AdminHeader } from '@/components/admin/header'
import { RequestsChart } from '@/components/admin/charts/requests-chart'
import { PlatformChart } from '@/components/admin/charts/platform-chart'
import { VersionChart } from '@/components/admin/charts/version-chart'
import { AnalyticsService } from '@/services/core/analytics/analytics-service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function AnalyticsPage() {
  const [platformData, versionData, requestsData] = await Promise.all([
    AnalyticsService.getPlatformBreakdown(),
    AnalyticsService.getVersionBreakdown(),
    AnalyticsService.getRequestsOverTime(),
  ])

  return (
    <div className="flex flex-col">
      <AdminHeader
        title="Analytics"
        description="Detailed usage analytics and metrics"
      />

      <div className="flex-1 space-y-6 p-6">
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
            <TabsTrigger value="versions">Versions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <RequestsChart data={requestsData} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Top Endpoints</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Coming soon: Most frequently accessed endpoints
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Geographic Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Coming soon: User distribution by country
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="platforms" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <PlatformChart data={platformData} />

              <Card>
                <CardHeader>
                  <CardTitle>Platform Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {platformData.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No platform data available
                      </p>
                    ) : (
                      platformData.map((p) => (
                        <div
                          key={p.platform}
                          className="flex items-center justify-between"
                        >
                          <span className="font-medium">{p.platform}</span>
                          <span className="text-muted-foreground">
                            {p.count.toLocaleString()} requests
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="versions" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <VersionChart data={versionData} />

              <Card>
                <CardHeader>
                  <CardTitle>Version Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {versionData.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No version data available
                      </p>
                    ) : (
                      versionData.map((v) => (
                        <div
                          key={v.version}
                          className="flex items-center justify-between"
                        >
                          <span className="font-medium">v{v.version}</span>
                          <span className="text-muted-foreground">
                            {v.count.toLocaleString()} requests
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

