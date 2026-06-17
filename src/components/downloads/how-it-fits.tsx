import { Package, RefreshCw, CloudOff } from 'lucide-react'
import { Section, Container } from '@/components/ui/section'

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

/** Reusable node: a circle with a simple line glyph + a label beneath it. */
function Node({
  cx,
  cy,
  label,
  glyph,
}: {
  cx: number
  cy: number
  label: string
  glyph: React.ReactNode
}) {
  return (
    <g className="text-slate-500 dark:text-slate-400">
      <circle
        cx={cx}
        cy={cy}
        r={30}
        className="fill-card stroke-border"
        strokeWidth={1.5}
      />
      <g
        transform={`translate(${cx - 11}, ${cy - 11})`}
        className="stroke-current"
        fill="none"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {glyph}
      </g>
      <text
        x={cx}
        y={cy + 48}
        textAnchor="middle"
        className="fill-muted-foreground text-[11px] font-medium"
      >
        {label}
      </text>
    </g>
  )
}

const laptopGlyph = (
  <>
    <rect x={2} y={2} width={18} height={13} rx={1.5} />
    <path d="M0 19h22" />
  </>
)
const phoneGlyph = (
  <>
    <rect x={6} y={1} width={10} height={20} rx={2.2} />
    <path d="M9.5 18h3" />
  </>
)
const globeGlyph = (
  <>
    <circle cx={11} cy={11} r={9} />
    <path d="M2 11h18" />
    <path d="M11 2c2.4 2.4 2.4 15.6 0 18M11 2c-2.4 2.4-2.4 15.6 0 18" />
  </>
)

export function HowItFits() {
  return (
    <Section tone="muted" spacing="default">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Diagram */}
          <div className="flex justify-center">
            <style>{`
              @keyframes wcpos-sync-flow { to { stroke-dashoffset: -16; } }
              .wcpos-flow-line {
                stroke-dasharray: 1 7;
                animation: wcpos-sync-flow 1.4s linear infinite;
              }
              @media (prefers-reduced-motion: reduce) {
                .wcpos-flow-line { animation: none; opacity: 0.25; }
              }
            `}</style>
            <svg
              viewBox="0 0 440 420"
              className="h-auto w-full max-w-[440px]"
              role="img"
              aria-label="A WooCommerce store with the WCPOS plugin sits at the centre, connected over a REST API to the desktop, iOS, Android and web apps, which all stay in sync."
            >
              {/* base connectors */}
              <g className="stroke-border" strokeWidth={1.5}>
                <line x1={220} y1={210} x2={220} y2={92} />
                <line x1={220} y1={210} x2={348} y2={210} />
                <line x1={220} y1={210} x2={220} y2={328} />
                <line x1={220} y1={210} x2={92} y2={210} />
              </g>
              {/* subtle two-way sync flow */}
              <g className="wcpos-flow-line stroke-wcpos-red/50" fill="none">
                <line x1={220} y1={210} x2={220} y2={92} />
                <line x1={220} y1={210} x2={348} y2={210} style={{ animationDelay: '0.3s' }} />
                <line x1={220} y1={210} x2={220} y2={328} style={{ animationDelay: '0.6s' }} />
                <line x1={220} y1={210} x2={92} y2={210} style={{ animationDelay: '0.9s' }} />
              </g>

              <Node cx={220} cy={72} label="Desktop" glyph={laptopGlyph} />
              <Node cx={368} cy={210} label="iOS & iPad" glyph={phoneGlyph} />
              <Node cx={220} cy={348} label="Android" glyph={phoneGlyph} />
              <Node cx={72} cy={210} label="Web" glyph={globeGlyph} />

              {/* hub */}
              <circle cx={220} cy={210} r={56} className="fill-wcpos-red" />
              <text
                x={220}
                y={203}
                textAnchor="middle"
                className="fill-white text-[13px] font-semibold"
              >
                Your store
              </text>
              <text x={220} y={220} textAnchor="middle" className="fill-white/90 text-[10.5px]">
                WooCommerce
              </text>
              <text x={220} y={235} textAnchor="middle" className="fill-white/70 text-[9px]">
                + WCPOS plugin
              </text>
            </svg>
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
