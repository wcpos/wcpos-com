'use client'

import { useTranslations } from 'next-intl'
import { SearchX } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Localized 404 page. Rendered when notFound() is triggered within the
 * [locale] segment — including unknown URLs caught by the [...rest]
 * catch-all route.
 *
 * Client component so that next-intl's Link resolves the locale from
 * NextIntlClientProvider context instead of request headers (which would
 * force dynamic rendering during static generation).
 */
export default function NotFoundPage() {
  const t = useTranslations('errors')
  const tHeader = useTranslations('header')

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardContent className="py-8 text-center text-muted-foreground">
          <SearchX className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <h1 className="font-medium text-foreground">{t('notFoundTitle')}</h1>
          <p className="text-sm mt-1">
            {t('notFoundDescription')}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href="/">{t('goHome')}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/pro">WCPOS Pro</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/support">{tHeader('support')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
