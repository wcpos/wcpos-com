import { AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatRelativeTime } from '@/lib/utils'

interface RecentError {
  id: string
  endpoint: string
  errorMessage: string | null
  platform: string | null
  appVersion: string | null
  createdAt: Date
}

interface RecentErrorsProps {
  errors: RecentError[]
}

export function RecentErrors({ errors }: RecentErrorsProps) {
  return (
    <Card className="col-span-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Errors</CardTitle>
        <AlertCircle className="h-4 w-4 text-destructive" />
      </CardHeader>
      <CardContent>
        {errors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent errors</p>
        ) : (
          <div className="space-y-4">
            {errors.map((error) => (
              <div
                key={error.id}
                className="flex items-start gap-4 rounded-lg border p-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{error.endpoint}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(error.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {error.errorMessage || 'Unknown error'}
                  </p>
                  <div className="flex gap-2">
                    {error.platform && (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
                        {error.platform}
                      </span>
                    )}
                    {error.appVersion && (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
                        v{error.appVersion}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

