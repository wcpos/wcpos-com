import * as React from 'react'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * The raised card every (auth) page sits in: one padded column (title block,
 * then the page's sections 20px apart), an optional hairline footer row for
 * the cross-link, and an optional slot under the card. A `status` tile
 * (an IconTile) turns the title block into a centred status view.
 */
export function AuthCard({
  title,
  description,
  status,
  footer,
  below,
  children,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  status?: React.ReactNode
  footer?: React.ReactNode
  below?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    // Centering and page chrome live in the (auth) layout.
    <div className="w-full max-w-md">
      <Card elevated>
        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-col items-center gap-1.5 text-center">
            {status && <div className="mb-1.5">{status}</div>}
            <CardTitle
              className={cn(
                'text-balance',
                status ? 'text-xl leading-7' : 'text-2xl leading-8 tracking-tight'
              )}
            >
              {title}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {children}
        </div>
        {footer && (
          <div className="border-t px-6 py-4 text-center text-sm text-muted-foreground sm:py-3.5">
            {footer}
          </div>
        )}
      </Card>
      {below}
    </div>
  )
}
