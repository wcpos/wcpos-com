import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

// The comparison verdict cards had no call to action; this puts one in the WCPOS card.
export function CompareChooseActions() {
  const t = useTranslations('home.cta')

  return (
    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
      <Button asChild size="lg">
        <a href="https://demo.wcpos.com/pos">{t('liveDemo')}</a>
      </Button>
      <Button asChild size="lg" variant="outline">
        <Link href="/downloads">{t('download')}</Link>
      </Button>
    </div>
  )
}
