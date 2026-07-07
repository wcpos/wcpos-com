import { Package, RefreshCw, CloudOff } from 'lucide-react'
import enMessages from '../../../messages/en.json'
import { Section, Container } from '@/components/ui/section'
import { SyncDiagram } from '@/components/downloads/sync-diagram'

const POINTS = [
  { key: 'setup', icon: Package },
  { key: 'sync', icon: RefreshCw },
  { key: 'offline', icon: CloudOff },
] as const

const SYNC_CHIPS = ['c1', 'c2', 'c3', 'c4', 'c5'] as const

type HowItFitsCopy = typeof enMessages.downloads.howItFits

export function HowItFits({
  copy = enMessages.downloads.howItFits,
}: {
  copy?: HowItFitsCopy
}) {
  const t = (key: string): string =>
    key.split('.').reduce<unknown>((value, part) =>
      value && typeof value === 'object' ? (value as Record<string, unknown>)[part] : undefined,
    copy) as string

  return (
    <Section tone="muted" spacing="default">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex justify-center">
            <SyncDiagram labels={copy.diagram} />
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-wcpos-red dark:text-wcpos-red-accent">
              {t('eyebrow')}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100 md:text-3xl">
              {t('title')}
            </h2>
            <ul className="mt-7 space-y-6">
              {POINTS.map(({ key, icon: Icon }) => (
                <li key={key} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-medium">{t(`points.${key}.title`)}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {t(`points.${key}.body`)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-xs font-medium text-muted-foreground">
              {t('syncLabel')}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {SYNC_CHIPS.map((chip) => (
                <li
                  key={chip}
                  className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-slate-600 dark:text-slate-300"
                >
                  {t(`chips.${chip}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </Section>
  )
}
