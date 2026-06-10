'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { clientLogger } from '@/lib/client-logger'

/**
 * Locale-level error boundary. Catches errors thrown by any page below
 * the [locale] layout (unless a closer boundary handles them first).
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    clientLogger.error`Page error: ${error.message} (digest: ${
      error.digest ?? 'none'
    })`
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="font-medium text-foreground">
            Something went wrong.
          </p>
          <p className="text-sm mt-1">
            The error has been reported. You can try again, or come back later.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={reset}>Try again</Button>
            <Button variant="outline" asChild>
              <Link href="/">Go to homepage</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
