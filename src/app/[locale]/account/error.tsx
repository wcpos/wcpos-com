'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { clientLogger } from '@/lib/client-logger'

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    clientLogger.error`Account page error: ${error.message} (digest: ${
      error.digest ?? 'none'
    })`
  }, [error])

  return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="font-medium text-foreground">
          Something went wrong loading this page.
        </p>
        <p className="text-sm mt-1">
          The error has been reported. You can try again, or come back later.
        </p>
        <Button className="mt-4" onClick={reset}>
          Try again
        </Button>
      </CardContent>
    </Card>
  )
}
