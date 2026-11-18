import { ChevronRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { TextLink } from '@/components/ui/text-link'

// Visible counterpart of the BreadcrumbList JSON-LD on each /compare/* page.
export function CompareBreadcrumb({ label, hubLabel, current }: { label: string; hubLabel: string; current: string }) {
  return (
    <nav aria-label={label} className="mb-6 flex justify-center text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
        <li>
          <TextLink asChild>
            <Link href="/compare">{hubLabel}</Link>
          </TextLink>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="h-3.5 w-3.5" />
        </li>
        <li aria-current="page">{current}</li>
      </ol>
    </nav>
  )
}
