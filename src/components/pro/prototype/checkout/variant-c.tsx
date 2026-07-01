/**
 * PROTOTYPE — throwaway code, do not ship.
 *
 * Checkout Variant C — "Split-screen paywall" (Stripe-Checkout style).
 * Full-height split: dark left pane keeps selling (product, price, trust)
 * while the right pane is a flat, boxless form — email, express pay, card,
 * compact address, one button. The page stops looking like a form page and
 * starts looking like a purchase moment.
 */
'use client'

import { ArrowLeft, Check } from 'lucide-react'
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

export function CheckoutVariantC({ signedIn }: { signedIn: boolean }) {
  const { state, pay } = useFakePay()

  if (state === 'done') return <SuccessScreen />

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — keep selling */}
      <div className="bg-slate-950 text-slate-50 px-8 py-10 lg:px-16 lg:py-16 flex flex-col">
        <Link
          href="/pro"
          className="inline-flex items-center text-sm text-slate-400 hover:text-slate-200 mb-12"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          WooCommerce POS Pro
        </Link>

        <div className="my-auto max-w-md">
          <p className="text-sm uppercase tracking-wide text-slate-400 mb-2">
            Pro Yearly
          </p>
          <p className="text-5xl font-bold mb-1">
            $129
            <span className="text-lg font-normal text-slate-400"> /year</span>
          </p>
          <p className="text-slate-400 mb-10">
            Manual renewal — we never bill you automatically.
          </p>

          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <Check className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
              License key delivered instantly to your email
            </li>
            <li className="flex gap-3">
              <Check className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
              Payment terminals, reports, and store management in the POS
            </li>
            <li className="flex gap-3">
              <Check className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
              Priority email support from the developers
            </li>
          </ul>
        </div>

        <p className="text-xs text-slate-500 mt-12">
          Trusted by 5,000+ active stores · Free & open source core since 2014
        </p>
      </div>

      {/* Right — the form, flat and boxless */}
      <div className="bg-background px-8 py-10 lg:px-16 lg:py-16 flex">
        <div className="m-auto w-full max-w-sm">
          <h2 className="text-lg font-semibold mb-6">Complete your purchase</h2>

          <div className="mb-6">
            <AccountBlock signedIn={signedIn} />
          </div>

          <ExpressPayRow onPay={pay} />

          <div className="space-y-6">
            <FakeCardFields />
            <CompactAddressFields />
            <PayButton label="Pay $129" state={state} onClick={pay} />
            <AltPaymentLinks />
          </div>
        </div>
      </div>
    </div>
  )
}
