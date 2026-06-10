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
      <CardContent className="py-8 text-center text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="font-medium text-foreground">{t('heading')}</p>
        <p className="text-sm mt-1">{t('description')}</p>
        <Button className="mt-4" onClick={reset}>
          {t('retry')}
        </Button>
      </CardContent>
    </Card>
  )
}
