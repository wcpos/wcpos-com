'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('account.error')

  useEffect(() => {
    clientLogger.error`Account page error: ${error.message} (digest: ${
      error.digest ?? 'none'
    })`
  }, [error])

  return (
    <Card>
      <CardContent className="flex flex-col items-center py-12 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-400/10">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <p className="font-medium">{t('heading')}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {t('description')}
        </p>
        <Button className="mt-4" onClick={reset}>
          {t('retry')}
        </Button>
      </CardContent>
    </Card>
  )
}
