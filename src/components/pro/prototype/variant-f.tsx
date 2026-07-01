/**
 * PROTOTYPE — throwaway code, do not ship.
 *
 * Variant F — "The receipt".
 * A POS company's pricing rendered as two till receipts: monospace type,
 * perforated sawtooth edges, dot leaders, a rubber-stamp badge and a
 * barcode. The $0.00 fee lines double as the value pitch. Playful, but set
 * with real typographic care — the joke only works if it's precise.
 */
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { PriceSlot } from './price-slot'
import type { PrototypePlanId } from './plans'

/** Sawtooth perforation strip (top or bottom edge of the receipt). */
function Perforation({ flip }: { flip?: boolean }) {
  return (
    <div
      aria-hidden
      className={`h-3 w-full ${flip ? 'rotate-180' : ''}`}
      style={{
        background:
          'linear-gradient(45deg, transparent 33.333%, var(--receipt-paper) 33.333%, var(--receipt-paper) 66.667%, transparent 66.667%), linear-gradient(-45deg, transparent 33.333%, var(--receipt-paper) 33.333%, var(--receipt-paper) 66.667%, transparent 66.667%)',
        backgroundSize: '12px 24px',
        backgroundPosition: '0 -12px',
      }}
    />
  )
}

function ReceiptLine({
  label,
  value,
  zero,
}: {
  label: string
  value: React.ReactNode
  zero?: boolean
}) {
  return (
    <div className="flex items-baseline gap-1.5 text-[13px] leading-6">
      <span className="whitespace-nowrap">{label}</span>
      <span className="flex-1 border-b border-dotted border-zinc-400/70 -translate-y-1" />
      <span className={`whitespace-nowrap ${zero ? 'text-green-700' : ''}`}>
        {value}
      </span>
    </div>
  )
}

function Barcode() {
  return (
    <div aria-hidden className="mt-4">
      <div
        className="h-10 w-full"
        style={{
          background:
            'repeating-linear-gradient(90deg, #18181b 0 2px, transparent 2px 5px, #18181b 5px 6px, transparent 6px 11px, #18181b 11px 14px, transparent 14px 17px, #18181b 17px 18px, transparent 18px 22px)',
        }}
      />
      <p className="mt-1 text-center text-[10px] tracking-[0.35em]">
        WCPOS·PRO·2014
      </p>
    </div>
  )
}

function Receipt({
  planId,
  title,
  delayMs,
  supportLine,
  updatesLine,
  totalSuffix,
  ctaLabel,
  featured,
  footerNote,
}: {
  planId: PrototypePlanId
  title: string
  delayMs: number
  supportLine: string
  updatesLine: string
  totalSuffix: string
  ctaLabel: string
  featured?: boolean
  footerNote: string
}) {
  return (
    <div
      className={`relative w-full max-w-sm font-mono text-zinc-800 [--receipt-paper:#fdfdfb] drop-shadow-xl ${
        featured ? 'md:-rotate-1' : 'md:rotate-1'
      }`}
    >
      {featured && (
        <div className="absolute -top-4 -right-3 z-10 rotate-[8deg] rounded border-[3px] border-primary px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-primary opacity-90 [mask-image:radial-gradient(circle_at_30%_40%,black_92%,transparent_100%)]">
          Most Popular
        </div>
      )}
      <Perforation />
      <div className="bg-[var(--receipt-paper)] px-6 py-5">
        <p className="text-center text-base font-bold tracking-widest">
          WCPOS
        </p>
        <p className="text-center text-[11px] text-zinc-500">
          POINT OF SALE FOR WOOCOMMERCE
        </p>
        <p className="mt-1 text-center text-[11px] text-zinc-500">
          ***** {title.toUpperCase()} *****
        </p>

        <div className="my-4 border-t border-dashed border-zinc-400/70" />

        <ReceiptLine label="Payment terminals" value="INCL" />
        <ReceiptLine label="Stock & price editing" value="INCL" />
        <ReceiptLine label="Orders & customers" value="INCL" />
        <ReceiptLine label="End-of-day reports" value="INCL" />
        <ReceiptLine label="Custom gateways" value="INCL" />
        <ReceiptLine label={supportLine} value="INCL" />
        <ReceiptLine label={updatesLine} value="INCL" />

        <div className="my-4 border-t border-dashed border-zinc-400/70" />

        <ReceiptLine label="Per-register fee" value="$0.00" zero />
        <ReceiptLine label="Transaction fee" value="$0.00" zero />
        <ReceiptLine label="Monthly subscription" value="$0.00" zero />
        <ReceiptLine label="Auto-renewal" value="NONE" zero />

        <div className="my-4 border-t border-dashed border-zinc-400/70" />

        <div className="flex items-baseline justify-between text-lg font-bold">
          <span>TOTAL</span>
          <span>
            <PriceSlot planId={planId} delayMs={delayMs} fallbackClassName="w-12" />
            <span className="text-xs font-normal">{totalSuffix}</span>
          </span>
        </div>
        <p className="mt-1 text-[11px] text-zinc-500">
          CHANGE DUE: your evenings back
        </p>

        <Button
          asChild
          size="lg"
          variant={featured ? 'default' : 'outline'}
          className="mt-5 w-full font-sans"
        >
          <Link href={`/pro/checkout?product=wcpos-pro-${planId}`}>
            {ctaLabel}
          </Link>
        </Button>
        <p className="mt-2 text-center text-[11px] text-zinc-500">
          {footerNote}
        </p>

        <Barcode />
        <p className="mt-3 text-center text-[11px] text-zinc-500">
          THANK YOU FOR SHOPPING INDEPENDENT
        </p>
      </div>
      <Perforation flip />
    </div>
  )
}

export function VariantF({ delayMs }: { delayMs: number }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col items-center gap-10 md:flex-row md:items-start md:justify-center">
        <Receipt
          planId="yearly"
          title="Pro Yearly"
          delayMs={delayMs}
          supportLine="Priority support (1yr)"
          updatesLine="Updates (1yr)"
          totalSuffix="/YR"
          ctaLabel="Ring it up"
          featured
          footerNote="One-time payment. Renew only if you want to."
        />
        <Receipt
          planId="lifetime"
          title="Pro Lifetime"
          delayMs={delayMs}
          supportLine="Priority support"
          updatesLine="Updates (forever)"
          totalSuffix=" ONCE"
          ctaLabel="Ring it up once"
          footerNote="About 3 years of Yearly — then $0 forever."
        />
      </div>
      <p className="mt-10 text-center text-sm text-muted-foreground">
        14-day money-back guarantee, no reason required · 5,000+ active stores
        · Free & open source since 2014
      </p>
    </div>
  )
}
