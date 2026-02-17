import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function AccountLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-40 animate-pulse rounded bg-muted" />
      <div className="space-y-4">
        {[1, 2, 3].map((card) => (
          <Card key={card}>
            <CardHeader>
              <div className="h-5 w-56 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
