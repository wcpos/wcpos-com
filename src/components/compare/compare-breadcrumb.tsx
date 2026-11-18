import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { TextLink } from '@/components/ui/text-link'

// Visible counterpart of the BreadcrumbList JSON-LD on each /compare/* page.
export function CompareBreadcrumb({ label, hubLabel, current }: { label: string; hubLabel: string; current: string }) {
  return (
    <nav aria-label={label} className="mb-6 flex justify-center text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
        <li>
          <TextLink asChild>
            <Link href="/compare" className="inline-flex items-center gap-1">
              <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5 sm:hidden" />
              {hubLabel}
            </Link>
          </TextLink>
        </li>
        <li aria-hidden="true" className="max-sm:hidden">
          <ChevronRight className="h-3.5 w-3.5" />
        </li>
        <li aria-current="page" className="max-sm:hidden">{current}</li>
      </ol>
    </nav>
  )
}
