import { useTranslations } from 'next-intl'
import { Download, KeyRound, Printer, RefreshCw, ScanBarcode } from 'lucide-react'
import { textLinkClassName } from '@/components/ui/text-link'
import { cn } from '@/lib/utils'

// docs.wcpos.com pages; plain links (same tab), so not TextLink, which opens
// external URLs in a new tab.
const GUIDES = [
  { key: 'installation', href: 'https://docs.wcpos.com/getting-started/installation', Icon: Download },
  { key: 'proLicense', href: 'https://docs.wcpos.com/getting-started/pro-license', Icon: KeyRound },
  { key: 'barcodeScanners', href: 'https://docs.wcpos.com/hardware/barcode-scanners', Icon: ScanBarcode },
  { key: 'receiptPrinters', href: 'https://docs.wcpos.com/hardware/receipt-printers', Icon: Printer },
  { key: 'productSync', href: 'https://docs.wcpos.com/manage-store/products/product-sync', Icon: RefreshCw },
] as const

export function SupportGuides({ className }: { className?: string }) {
  const t = useTranslations('support.guides')
  return (
    <div className={className}>
      <h2 className="mb-5 text-2xl font-bold text-foreground">{t('title')}</h2>
      <ul className="grid list-none gap-x-8 gap-y-3.5 sm:grid-cols-2">
        {GUIDES.map(({ key, href, Icon }) => (
          <li key={key}>
            <a href={href} className={cn(textLinkClassName, 'flex items-start gap-3 text-[15px] leading-snug')}>
              <Icon aria-hidden="true" className="mt-px size-4 shrink-0 text-muted-foreground" />
              <span>{t(key)}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
