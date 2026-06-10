'use client'

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
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardContent className="py-8 text-center text-muted-foreground">
          <SearchX className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <h1 className="font-medium text-foreground">Page not found</h1>
          <p className="text-sm mt-1">
            The page you are looking for does not exist or may have moved.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href="/">Go to homepage</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/pro">WCPOS Pro</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/support">Support</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
