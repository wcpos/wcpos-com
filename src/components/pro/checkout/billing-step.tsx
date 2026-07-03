'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

/**
 * Billing address step — the minimum honest address block. The parent owns
 * persistence (PATCH cart billing_address); this component only collects
 * and validates the fields and reports them upward.
 */
export interface BillingAddress {
  first_name: string
  last_name: string
  address_1: string
  city: string
  postal_code: string
  country_code: string
}

export function billingAddressSummary(address: BillingAddress): string {
  return `${address.address_1}, ${address.city} ${address.postal_code.toUpperCase()}, ${address.country_code.toUpperCase()}`
}

const COUNTRIES: Array<{ code: string; label: string }> = [
  { code: 'au', label: 'Australia' },
  { code: 'at', label: 'Austria' },
  { code: 'be', label: 'Belgium' },
  { code: 'br', label: 'Brazil' },
  { code: 'ca', label: 'Canada' },
  { code: 'dk', label: 'Denmark' },
  { code: 'fi', label: 'Finland' },
  { code: 'fr', label: 'France' },
  { code: 'de', label: 'Germany' },
  { code: 'ie', label: 'Ireland' },
  { code: 'it', label: 'Italy' },
  { code: 'jp', label: 'Japan' },
  { code: 'kr', label: 'South Korea' },
  { code: 'mx', label: 'Mexico' },
  { code: 'nl', label: 'Netherlands' },
  { code: 'nz', label: 'New Zealand' },
  { code: 'no', label: 'Norway' },
  { code: 'pt', label: 'Portugal' },
  { code: 'sg', label: 'Singapore' },
  { code: 'za', label: 'South Africa' },
  { code: 'es', label: 'Spain' },
  { code: 'se', label: 'Sweden' },
  { code: 'ch', label: 'Switzerland' },
  { code: 'gb', label: 'United Kingdom' },
  { code: 'us', label: 'United States' },
]

interface BillingStepProps {
  initialAddress?: BillingAddress | null
  /** Resolves when the address is persisted; rejections keep the step open. */
  onSubmit: (address: BillingAddress) => Promise<void>
}

export function BillingStep({ initialAddress, onSubmit }: BillingStepProps) {
  const [firstName, setFirstName] = useState(initialAddress?.first_name ?? '')
  const [lastName, setLastName] = useState(initialAddress?.last_name ?? '')
  const [address1, setAddress1] = useState(initialAddress?.address_1 ?? '')
  const [city, setCity] = useState(initialAddress?.city ?? '')
  const [postalCode, setPostalCode] = useState(
    initialAddress?.postal_code ?? ''
  )
  const [countryCode, setCountryCode] = useState(
    initialAddress?.country_code ?? 'us'
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        address_1: address1.trim(),
        city: city.trim(),
        postal_code: postalCode.trim(),
        country_code: countryCode,
      })
    } catch (error) {
      const paymentRefreshError =
        error instanceof Error && error.name === 'PaymentRefreshError'
          ? error.message
          : null
      setError(
        paymentRefreshError ??
          'Could not save your billing address. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="billing-step-form">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="First name" htmlFor="billing-first-name">
          <Input
            id="billing-first-name"
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </FormField>
        <FormField label="Last name" htmlFor="billing-last-name">
          <Input
            id="billing-last-name"
            autoComplete="family-name"
            required
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Address" htmlFor="billing-address">
        <Input
          id="billing-address"
          autoComplete="street-address"
          required
          value={address1}
          onChange={(event) => setAddress1(event.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="City" htmlFor="billing-city">
          <Input
            id="billing-city"
            autoComplete="address-level2"
            required
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
        </FormField>
        <FormField label="Postal code" htmlFor="billing-postal">
          <Input
            id="billing-postal"
            autoComplete="postal-code"
            required
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Country" htmlFor="billing-country">
        <Select
          id="billing-country"
          autoComplete="country"
          required
          value={countryCode}
          onChange={(event) => setCountryCode(event.target.value)}
        >
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.label}
            </option>
          ))}
        </Select>
      </FormField>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Continue to payment'}
      </Button>
    </form>
  )
}
