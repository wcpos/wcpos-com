import {
  Bitcoin,
  CreditCard,
  Download,
  MonitorPlay,
  ShieldCheck,
} from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { TextLink } from '@/components/ui/text-link'
import type { TranslateFn } from './pro-buy-box-options'

// The public demo, which runs with Pro activated.
const DEMO_URL = 'https://demo.wcpos.com/pos'

export function ProBuyBoxFooter({ t }: { t: TranslateFn }) {
  return (
    <>
      <div className="mt-5 space-y-2 border-t pt-4 text-sm text-muted-foreground">
        <p className="flex items-center gap-2">
          <Download className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            <TextLink asChild>
              <Link href="/downloads">{t('buyBox.tryFreeLink')}</Link>
            </TextLink>
            {t('buyBox.tryFreeSuffix')}
          </span>
        </p>
        <p className="flex items-center gap-2">
          <MonitorPlay className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            <TextLink asChild>
              <a href={DEMO_URL}>{t('buyBox.demoLink')}</a>
            </TextLink>
            {t('buyBox.demoSuffix')}
          </span>
        </p>
        <p className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex items-center gap-1">
            {t('buyBox.payments')}
            <Bitcoin className="h-4 w-4" aria-hidden />
          </span>
        </p>
        <p className="flex items-center gap-2 text-xs">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            {t('checkout.summary.refundPromise')}{' '}
            <TextLink asChild>
              <Link href="/refunds">{t('checkout.summary.refundLink')}</Link>
            </TextLink>
          </span>
        </p>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        {t('buyBox.proof')}
      </p>
    </>
  )
}
