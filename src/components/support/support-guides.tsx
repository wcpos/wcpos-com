import { useTranslations } from 'next-intl'
import { Section } from '@/components/ui/section'
import { textLinkClassName } from '@/components/ui/text-link'

// docs.wcpos.com pages; plain links (same tab), so not TextLink, which opens
// external URLs in a new tab.
const GUIDES = [
  { key: 'installation', href: 'https://docs.wcpos.com/getting-started/installation' },
  { key: 'proLicense', href: 'https://docs.wcpos.com/getting-started/pro-license' },
  { key: 'barcodeScanners', href: 'https://docs.wcpos.com/hardware/barcode-scanners' },
  { key: 'receiptPrinters', href: 'https://docs.wcpos.com/hardware/receipt-printers' },
  { key: 'productSync', href: 'https://docs.wcpos.com/manage-store/products/product-sync' },
] as const

export function SupportGuides() {
  const t = useTranslations('support.guides')
  return (
    <Section spacing="none" className="pb-10 sm:pb-16">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-2xl font-bold text-foreground mb-4">{t('title')}</h2>
        <ul className="list-none grid gap-3 sm:grid-cols-2">
          {GUIDES.map(({ key, href }) => (
            <li key={key}>
              <a href={href} className={textLinkClassName}>
                {t(key)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}
