'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
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
      <EmptyState
        tone="caution"
        icon={<AlertTriangle />}
        title={t('heading')}
        description={t('description')}
        action={<Button onClick={reset}>{t('retry')}</Button>}
      />
    </Card>
  )
}
