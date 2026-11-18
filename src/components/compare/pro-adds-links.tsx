import type { ReactNode } from 'react'
import { Link } from '@/i18n/navigation'
import { TextLink } from '@/components/ui/text-link'

// Rich-text tags for the compare.<page>.pricing.proAdds strings.
export const proAddsLinks = {
  pro: (chunks: ReactNode) => (
    <TextLink asChild>
      <Link href="/pro">{chunks}</Link>
    </TextLink>
  ),
  ext: (chunks: ReactNode) => (
    <TextLink asChild>
      <Link href="/extensions">{chunks}</Link>
    </TextLink>
  ),
}
