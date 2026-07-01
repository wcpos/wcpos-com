/**
 * PROTOTYPE — throwaway code, do not ship.
 *
 * Checkout Variant B — "Three steps that collapse".
 * Account → Billing → Payment as an accordion: one thing on screen at a
 * time, completed steps collapse to a ✓ summary line with Edit. Sticky
 * order summary on the right keeps price and contents visible throughout.
 * Signed-in users start on step 2 with step 1 already ticked.
 */
'use client'

import { useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import {
  AccountBlock,
  AltPaymentLinks,
  CompactAddressFields,
  FakeCardFields,
  PayButton,
  STUB_SIGNED_IN_EMAIL,
  SuccessScreen,
  useFakePay,
} from './stubs'

type StepId = 1 | 2 | 3

function StepShell({
  step,
  title,
  summary,
  activeStep,
  onEdit,
  children,
}: {
  step: StepId
  title: string
  summary: string
  activeStep: StepId
  onEdit: () => void
  children: React.ReactNode
}) {
  const isActive = step === activeStep
  const isDone = step < activeStep

  return (
    <div className={`rounded-xl border ${isActive ? 'bg-card shadow-sm' : 'bg-muted/30'}`}>
      <div className="flex items-center gap-3 px-5 py-4">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            isDone
              ? 'bg-green-500 text-white'
              : isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
          }`}
        >
          {isDone ? <Check className="h-3.5 w-3.5" /> : step}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${isActive ? '' : 'text-muted-foreground'}`}>
            {title}
          </p>
          {isDone && (
            <p className="truncate text-sm text-muted-foreground">{summary}</p>
          )}
        </div>
        {isDone && (
          <button
            type="button"
            onClick={onEdit}
            className="text-sm text-muted-foreground underline"
          >
            Edit
          </button>
        )}
      </div>
      {isActive && <div className="border-t px-5 py-5">{children}</div>}
    </div>
  )
}

export function CheckoutVariantB({ signedIn }: { signedIn: boolean }) {
  const [step, setStep] = useState<StepId>(signedIn ? 2 : 1)
  const { state, pay } = useFakePay()

  if (state === 'done') return <SuccessScreen />

  return (
    <div className="container mx-auto px-4 py-10">
      <Link
        href="/pro"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to pricing
      </Link>

      <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-[1.6fr_1fr] items-start">
        {/* Steps */}
        <div className="space-y-3">
          <StepShell
            step={1}
            title="Account"
            summary={STUB_SIGNED_IN_EMAIL}
            activeStep={step}
            onEdit={() => setStep(1)}
          >
            <div className="space-y-4">
              <AccountBlock signedIn={signedIn} />
              <Button onClick={() => setStep(2)}>Continue</Button>
            </div>
          </StepShell>

          <StepShell
            step={2}
            title="Billing address"
            summary="42 Wallaby Way, Sydney AU"
            activeStep={step}
            onEdit={() => setStep(2)}
          >
            <div className="space-y-4">
              <CompactAddressFields />
              <Button onClick={() => setStep(3)}>Continue</Button>
            </div>
          </StepShell>

          <StepShell
            step={3}
            title="Payment"
            summary=""
            activeStep={step}
            onEdit={() => setStep(3)}
          >
            <div className="space-y-4">
              <FakeCardFields />
              <PayButton label="Pay $129 now" state={state} onClick={pay} />
              <AltPaymentLinks />
            </div>
          </StepShell>
        </div>

        {/* Sticky order summary */}
        <div className="rounded-xl border bg-card p-5 md:sticky md:top-24">
          <p className="font-semibold mb-1">WooCommerce POS Pro</p>
          <p className="text-sm text-muted-foreground mb-4">Yearly license</p>
          <div className="flex justify-between text-sm py-1">
            <span>Subtotal</span>
            <span>$129.00</span>
          </div>
          <div className="mt-3 border-t pt-3 flex justify-between font-bold">
            <span>Total</span>
            <span>$129.00</span>
          </div>
          <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              Instant license delivery
            </li>
            <li className="flex gap-2">
              <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              Updates & support for 1 year
            </li>
            <li className="flex gap-2">
              <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              No automatic billing
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
