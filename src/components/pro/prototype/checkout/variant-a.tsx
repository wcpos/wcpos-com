/**
 * PROTOTYPE — throwaway code, do not ship.
 *
 * Checkout Variant A — "One column, express-first".
 * Everything on one screen in reading order: order pill → wallet buttons →
 * email → billing address → card → pay. No login bounce (account is created
 * from the email), no tabs, no boxes-within-boxes. Wallet payments skip the
 * card + address typing entirely.
 */
'use client'

import { ArrowLeft } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import {
  AccountBlock,
  AltPaymentLinks,
  CompactAddressFields,
  ExpressPayRow,
  FakeCardFields,
  PayButton,
  SuccessScreen,
  useFakePay,
} from './stubs'

export function CheckoutVariantA({ signedIn }: { signedIn: boolean }) {
  const { state, pay } = useFakePay()

  if (state === 'done') return <SuccessScreen />

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <Link
          href="/pro"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to pricing
        </Link>

        {/* Order pill */}
        <div className="mb-8 flex items-center justify-between rounded-xl border bg-card px-4 py-3">
          <div>
            <p className="font-semibold">WooCommerce POS Pro — Yearly</p>
            <p className="text-sm text-muted-foreground">
              License for unlimited sites · renews manually
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl font-bold">$129</p>
            <Link
              href="/pro"
              className="text-xs text-muted-foreground underline"
            >
              change
            </Link>
          </div>
        </div>

        <ExpressPayRow onPay={pay} />

        <div className="space-y-6">
          <AccountBlock signedIn={signedIn} />
          <FakeCardFields />
          <CompactAddressFields />
          <PayButton label="Pay $129" state={state} onClick={pay} />
          <AltPaymentLinks />
          <p className="text-center text-xs text-muted-foreground">
            Secure payment · Instant license delivery
          </p>
        </div>
      </div>
    </div>
  )
}
