import { Card, CardContent } from '@/components/ui/card'

/**
 * Inline state card for admin pages: unconfigured integrations, upstream
 * errors, and empty results. Server component — render with pre-sanitized
 * text only (never raw upstream error bodies).
 */
export function StateCard({ title, detail }: { title: string; detail: string }) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-sm">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

/**
 * The shared "Medusa admin access not configured" state for the customers
 * and orders browsers (mirrors the logs viewer's unconfigured card).
 */
export function MedusaAdminUnconfiguredCard() {
  return (
    <StateCard
      title="Medusa admin access not configured"
      detail="Set MEDUSA_ADMIN_API_KEY (a Medusa secret API key) to enable the customers and orders browsers."
    />
  )
}
