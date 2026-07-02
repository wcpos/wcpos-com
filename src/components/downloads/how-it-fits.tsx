import { Package, RefreshCw, CloudOff } from 'lucide-react'
import { Section, Container } from '@/components/ui/section'
import { SyncDiagram } from '@/components/downloads/sync-diagram'

const POINTS = [
  {
    icon: Package,
    title: 'One plugin is the only setup',
    body: 'The free plugin adds a secure REST API to your WooCommerce store. That’s the whole install — nothing to host or configure per device.',
  },
  {
    icon: RefreshCw,
    title: 'Every app reads and writes the same store',
    body: 'Ring up a sale on the desktop, refund it on your phone — one set of products, orders and customers, updating in real time.',
  },
  {
    icon: CloudOff,
    title: 'Offline-first, so the till never stops',
    body: 'Each device keeps working without a connection and re-syncs the moment it’s back online.',
  },
]

const SYNC_CHIPS = [
  'Products & prices',
  'Stock levels',
  'Orders',
  'Customers',
  'Tax & receipts',
]

export function HowItFits() {
  return (
    <Section tone="muted" spacing="default">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Diagram */}
          <div className="flex justify-center">
            <SyncDiagram />
          </div>

          {/* Explanation */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-wcpos-red dark:text-wcpos-red-accent">
              How it fits together
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100 md:text-3xl">
              One store at the centre. Every till in sync.
            </h2>
            <ul className="mt-7 space-y-6">
              {POINTS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-medium">{title}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-xs font-medium text-muted-foreground">
              What stays in sync
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {SYNC_CHIPS.map((chip) => (
                <li
                  key={chip}
                  className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-slate-600 dark:text-slate-300"
                >
                  {chip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </Section>
  )
}
