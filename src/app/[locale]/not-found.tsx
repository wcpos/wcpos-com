import { SiteHeader } from '@/components/main/site-header'
import { SiteFooter } from '@/components/main/site-footer'
import { NotFoundContent } from '@/components/main/not-found-content'

/**
 * Localized 404 page, inside the site shell so a lost visitor keeps the
 * header and footer. Rendered when notFound() is triggered within the
 * [locale] segment — including unknown URLs caught by the [...rest]
 * catch-all route. The [locale] layout has already set the request locale
 * (falling back to the default for an invalid one), which the shell's
 * translations read.
 */
export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <NotFoundContent />
      <SiteFooter />
    </div>
  )
}
