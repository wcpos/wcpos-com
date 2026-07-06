'use client'

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { buildCountryOptions, taxIdLabelKey } from '@/lib/billing-countries'

/**
 * Billing address step — the minimum honest address block. The parent owns
 * persistence (PATCH cart billing_address); this component only collects
 * and validates the fields and reports them upward.
 */
export interface BillingAddress {
  first_name: string
  last_name: string
  address_1: string
  address_2: string
  city: string
  province: string
  postal_code: string
  country_code: string
}

export function billingAddressSummary(address: BillingAddress): string {
  return [
    address.address_1,
    address.address_2,
    [
      address.city,
      address.province,
      address.postal_code.toUpperCase(),
    ].filter(Boolean).join(' '),
    address.country_code.toUpperCase(),
  ].filter(Boolean).join(', ')
}

export { taxIdLabel } from '@/lib/billing-countries'

interface BillingStepProps {
  initialAddress?: BillingAddress | null
  /** Prefill for the optional tax field (customer profile's taxNumber). */
  initialTaxNumber?: string
  /** Resolves when the address is persisted; rejections keep the step open. */
  onSubmit: (
    address: BillingAddress,
    extras: { taxNumber: string }
  ) => Promise<void>
}

export function BillingStep({
  initialAddress,
  initialTaxNumber,
  onSubmit,
}: BillingStepProps) {
  const locale = useLocale()
  const t = useTranslations('pro.checkout.billing')
  const tTaxLabel = useTranslations('account.profile.taxLabels')
  const [firstName, setFirstName] = useState(initialAddress?.first_name ?? '')
  const [lastName, setLastName] = useState(initialAddress?.last_name ?? '')
  const [address1, setAddress1] = useState(initialAddress?.address_1 ?? '')
  const [address2, setAddress2] = useState(initialAddress?.address_2 ?? '')
  const [city, setCity] = useState(initialAddress?.city ?? '')
  const [province, setProvince] = useState(initialAddress?.province ?? '')
  const [postalCode, setPostalCode] = useState(
    initialAddress?.postal_code ?? ''
  )
  const [countryCode, setCountryCode] = useState(
    initialAddress?.country_code ?? 'us'
  )
  const [taxNumber, setTaxNumber] = useState(initialTaxNumber ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const billingCountries = useMemo(
    () =>
      buildCountryOptions(locale, true).map(([code, label]) => ({
        code,
        label,
      })),
    [locale]
  )

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      const address: BillingAddress = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        address_1: address1.trim(),
        city: city.trim(),
        postal_code: postalCode.trim(),
        country_code: countryCode,
        address_2: address2.trim(),
        province: province.trim(),
      }

      await onSubmit(
        address,
        { taxNumber: taxNumber.trim() }
      )
    } catch (error) {
      const paymentRefreshError =
        error instanceof Error && error.name === 'PaymentRefreshError'
          ? error.message
          : null
      setError(
        paymentRefreshError ??
          t('errors.saveFailed')
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="billing-step-form">
      <div className="grid grid-cols-2 gap-3">
        <FormField label={t('fields.firstName')} htmlFor="billing-first-name">
          <Input
            id="billing-first-name"
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </FormField>
        <FormField label={t('fields.lastName')} htmlFor="billing-last-name">
          <Input
            id="billing-last-name"
            autoComplete="family-name"
            required
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </FormField>
      </div>

      <FormField label={t('fields.addressLine1')} htmlFor="billing-address-line-1">
        <Input
          id="billing-address-line-1"
          autoComplete="address-line1"
          required
          value={address1}
          onChange={(event) => setAddress1(event.target.value)}
        />
      </FormField>

      <FormField label={t('fields.addressLine2')} htmlFor="billing-address-line-2">
        <Input
          id="billing-address-line-2"
          autoComplete="address-line2"
          value={address2}
          onChange={(event) => setAddress2(event.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label={t('fields.city')} htmlFor="billing-city">
          <Input
            id="billing-city"
            autoComplete="address-level2"
            required
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
        </FormField>
        <FormField
          label={t('fields.province')}
          htmlFor="billing-province"
        >
          <Input
            id="billing-province"
            autoComplete="address-level1"
            value={province}
            onChange={(event) => setProvince(event.target.value)}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label={t('fields.postalCode')} htmlFor="billing-postal">
          <Input
            id="billing-postal"
            autoComplete="postal-code"
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
          />
        </FormField>
      </div>

      <FormField label={t('fields.country')} htmlFor="billing-country">
        <Select
          id="billing-country"
          autoComplete="country"
          required
          value={countryCode}
          onChange={(event) => setCountryCode(event.target.value)}
        >
          {billingCountries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label={
          <>
            {tTaxLabel(taxIdLabelKey(countryCode))}{' '}
            <span className="text-muted-foreground font-normal">
              {t('optional')}
            </span>
          </>
        }
        htmlFor="billing-tax-number"
      >
        <Input
          id="billing-tax-number"
          value={taxNumber}
          onChange={(event) => setTaxNumber(event.target.value)}
        />
      </FormField>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t('saving') : t('continue')}
      </Button>
    </form>
  )
}
