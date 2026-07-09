'use client'

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { locales, localeNames, type Locale } from '@/i18n/config'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Mail } from 'lucide-react'
import { GitHubMark, GoogleMark } from '@/components/auth/provider-marks'
import { getConnectedAvatarUrlFromMetadata } from '@/lib/avatar'
import { readAccountProfileMetadata } from '@/lib/customer-profile-metadata'
import type { BillingDetails } from '@/lib/billing-profile'
import {
  buildCountryOptions,
  COUNTRY_TAX_LABEL_KEYS,
  type TaxLabelKey,
} from '@/lib/billing-countries'

interface ProfileEditFormProps {
  customer: {
    email: string
    first_name?: string
    last_name?: string
    phone?: string
    metadata?: Record<string, unknown>
  }
  /** Projected from the default billing customer address (the single source
   * of truth for billing details) by the server component. */
  billingDetails: BillingDetails
  memberSince?: string
  connections?: {
    signIn: { provider: 'google' | 'github' | 'email'; email: string }
  }
}

// Message keys under account.profile.{regionLabels,postalLabels,taxLabels};
// the labels themselves live in messages/*.json so they can be translated.
type RegionLabelKey =
  | 'state'
  | 'province'
  | 'county'
  | 'stateTerritory'
  | 'region'
  | 'prefecture'
type PostalLabelKey = 'zip' | 'postalCode' | 'postcode'
type ProfileErrorCode =
  | 'read_only_inspection'
  | 'unauthorized'
  | 'update_failed'

const PROFILE_ERROR_CODES = new Set<ProfileErrorCode>([
  'read_only_inspection',
  'unauthorized',
  'update_failed',
])

function isProfileErrorCode(value: unknown): value is ProfileErrorCode {
  return typeof value === 'string' && PROFILE_ERROR_CODES.has(value as ProfileErrorCode)
}

function getProfileErrorMessage(
  errorCode: ProfileErrorCode,
  t: ReturnType<typeof useTranslations<'account.profile'>>
): string {
  switch (errorCode) {
    case 'read_only_inspection':
      return t('apiErrors.read_only_inspection')
    case 'unauthorized':
      return t('apiErrors.unauthorized')
    case 'update_failed':
      return t('apiErrors.update_failed')
  }
}

type CountryProfile = {
  regionLabel: RegionLabelKey
  postalLabel: PostalLabelKey
  /** From the shared checkout/profile vocabulary (billing-countries.ts). */
  taxLabel: TaxLabelKey
}

function taxLabelFor(countryCode: string): TaxLabelKey {
  return COUNTRY_TAX_LABEL_KEYS[countryCode.toLowerCase()] ?? 'genericTaxId'
}

const COUNTRY_PROFILES: Record<string, CountryProfile> = {
  US: { regionLabel: 'state', postalLabel: 'zip', taxLabel: taxLabelFor('US') },
  CA: { regionLabel: 'province', postalLabel: 'postalCode', taxLabel: taxLabelFor('CA') },
  GB: { regionLabel: 'county', postalLabel: 'postcode', taxLabel: taxLabelFor('GB') },
  AU: { regionLabel: 'stateTerritory', postalLabel: 'postcode', taxLabel: taxLabelFor('AU') },
  DE: { regionLabel: 'state', postalLabel: 'postalCode', taxLabel: taxLabelFor('DE') },
  FR: { regionLabel: 'region', postalLabel: 'postalCode', taxLabel: taxLabelFor('FR') },
  ES: { regionLabel: 'province', postalLabel: 'postalCode', taxLabel: taxLabelFor('ES') },
  IT: { regionLabel: 'province', postalLabel: 'postalCode', taxLabel: taxLabelFor('IT') },
  NL: { regionLabel: 'province', postalLabel: 'postalCode', taxLabel: taxLabelFor('NL') },
  NZ: { regionLabel: 'region', postalLabel: 'postcode', taxLabel: taxLabelFor('NZ') },
  JP: { regionLabel: 'prefecture', postalLabel: 'postalCode', taxLabel: taxLabelFor('JP') },
}

function getInitials(firstName: string, lastName: string, email: string): string {
  const first = firstName.trim().charAt(0)
  const last = lastName.trim().charAt(0)

  if (first || last) {
    return `${first}${last}`.toUpperCase()
  }

  return email.trim().charAt(0).toUpperCase() || 'U'
}

function getAvatarDefaults(metadata: Record<string, unknown> | undefined): {
  oauthAvatarUrl: string
  customAvatarUrl: string
  customAvatarDataUrl: string
} {
  const accountProfile = readAccountProfileMetadata(metadata)

  return {
    oauthAvatarUrl: getConnectedAvatarUrlFromMetadata(metadata),
    customAvatarUrl: accountProfile.avatarUrl,
    customAvatarDataUrl: accountProfile.avatarDataUrl,
  }
}

export function ProfileEditForm({
  customer,
  billingDetails,
  memberSince,
  connections,
}: ProfileEditFormProps) {
  const locale = useLocale()
  const t = useTranslations('account.profile')
  const router = useRouter()
  const pathname = usePathname()
  const avatarDefaults = getAvatarDefaults(customer.metadata)

  // Changing the language persists the preference to the account and reloads
  // the page in that locale. Mirrors the header LanguageSelector; the URL/cookie
  // locale is the immediate source of truth so anonymous/failed writes still
  // switch the visible language.
  function handleLanguageChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const nextLocale = event.target.value as Locale
    if (nextLocale === locale) return
    void fetch('/api/account/locale', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: nextLocale }),
    }).catch(() => {})
    router.replace(pathname, { locale: nextLocale })
  }
  const countryOptions = useMemo(() => buildCountryOptions(locale), [locale])

  // Email is not editable: the profile API deliberately never forwards it to
  // Medusa (the store update-customer endpoint rejects unknown fields).
  const email = customer.email ?? ''
  const [firstName, setFirstName] = useState(customer.first_name ?? '')
  const [lastName, setLastName] = useState(customer.last_name ?? '')
  const [phone, setPhone] = useState(customer.phone ?? '')
  // Saved billing state, normalized to the form's vocabulary (the country
  // dropdown always shows a value). Saves that leave billing untouched omit
  // it from the payload so the server doesn't rewrite an identical address.
  const savedBilling = useMemo(
    () => ({ ...billingDetails, countryCode: billingDetails.countryCode || 'US' }),
    [billingDetails]
  )
  const [billingBaseline, setBillingBaseline] = useState(savedBilling)
  const [countryCode, setCountryCode] = useState(savedBilling.countryCode)
  const [addressLine1, setAddressLine1] = useState(savedBilling.addressLine1)
  const [addressLine2, setAddressLine2] = useState(savedBilling.addressLine2)
  const [city, setCity] = useState(savedBilling.city)
  const [region, setRegion] = useState(savedBilling.region)
  const [postalCode, setPostalCode] = useState(savedBilling.postalCode)
  const [taxNumber, setTaxNumber] = useState(savedBilling.taxNumber)
  const [customAvatarDataUrl, setCustomAvatarDataUrl] = useState(
    avatarDefaults.customAvatarDataUrl
  )
  const [customAvatarUrl, setCustomAvatarUrl] = useState(
    avatarDefaults.customAvatarUrl
  )
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const countryProfile =
    COUNTRY_PROFILES[countryCode] ?? COUNTRY_PROFILES.US


  const avatarUrl = useMemo(() => {
    return customAvatarDataUrl || customAvatarUrl || avatarDefaults.oauthAvatarUrl
  }, [customAvatarDataUrl, customAvatarUrl, avatarDefaults.oauthAvatarUrl])

  const initials = getInitials(firstName, lastName, email)

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 1024 * 1024) {
      setError(t('avatarTooLarge'))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (!result.startsWith('data:image/')) {
        setError(t('avatarInvalid'))
        return
      }

      setError(null)
      setCustomAvatarDataUrl(result)
      setCustomAvatarUrl('')
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setSuccess(null)
    setError(null)

    const billingChanged =
      countryCode !== billingBaseline.countryCode ||
      addressLine1 !== billingBaseline.addressLine1 ||
      addressLine2 !== billingBaseline.addressLine2 ||
      city !== billingBaseline.city ||
      region !== billingBaseline.region ||
      postalCode !== billingBaseline.postalCode ||
      taxNumber !== billingBaseline.taxNumber

    try {
      const response = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone,
          avatar: {
            avatarDataUrl: customAvatarDataUrl || null,
            avatarUrl: customAvatarUrl || null,
          },
          // Only assert billing when the user actually changed it — an
          // untouched form must not write (or create) an address record.
          ...(billingChanged
            ? {
                billingAddress: {
                  countryCode,
                  addressLine1,
                  addressLine2: addressLine2 || null,
                  city,
                  region,
                  postalCode,
                  taxNumber: taxNumber || null,
                },
              }
            : {}),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          isProfileErrorCode(data.errorCode)
            ? getProfileErrorMessage(data.errorCode, t)
            : t('updateError')
        )
      }

      const updatedAvatar = getAvatarDefaults(data.customer?.metadata)
      const updatedBilling = (data.billingDetails ?? {}) as Partial<BillingDetails>
      const nextBilling = {
        countryCode: updatedBilling.countryCode || 'US',
        addressLine1: updatedBilling.addressLine1 ?? '',
        addressLine2: updatedBilling.addressLine2 ?? '',
        city: updatedBilling.city ?? '',
        region: updatedBilling.region ?? '',
        postalCode: updatedBilling.postalCode ?? '',
        taxNumber: updatedBilling.taxNumber ?? '',
      }

      setFirstName(data.customer.first_name ?? '')
      setLastName(data.customer.last_name ?? '')
      setPhone(data.customer.phone ?? '')
      setBillingBaseline(nextBilling)
      setCountryCode(nextBilling.countryCode)
      setAddressLine1(nextBilling.addressLine1)
      setAddressLine2(nextBilling.addressLine2)
      setCity(nextBilling.city)
      setRegion(nextBilling.region)
      setPostalCode(nextBilling.postalCode)
      setTaxNumber(nextBilling.taxNumber)
      setCustomAvatarDataUrl(updatedAvatar.customAvatarDataUrl)
      setCustomAvatarUrl(updatedAvatar.customAvatarUrl)
      setSuccess(t('updateSuccess'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('updateError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,19rem)_1fr]">
      {/* Identity rail: who you are + account-level settings. Everything
          here is either display-only or self-saving (language), so it lives
          outside the profile <form>. */}
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-1 pt-6 text-center">
            <Avatar className="h-16 w-16">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={t('avatarAlt')} />
              ) : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            {/* Live preview: reflects the name fields as they are edited. */}
            <p className="mt-2 font-semibold">
              {[firstName, lastName].filter(Boolean).join(' ') || email}
            </p>
            <p className="text-sm text-muted-foreground">{email}</p>
            {memberSince && (
              <Badge variant="muted-tint" className="mt-2">
                {t('memberSince')} {memberSince}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('languageTitle')}</CardTitle>
            <CardDescription>{t('languageHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              aria-label={t('languageTitle')}
              value={locale}
              onChange={handleLanguageChange}
            >
              {locales.map((loc) => (
                <option key={loc} value={loc}>
                  {localeNames[loc]}
                </option>
              ))}
            </Select>
          </CardContent>
        </Card>

        {connections && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('connectionsTitle')}</CardTitle>
              <CardDescription>{t('connectionsHint')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex items-center gap-4 py-3">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-md border">
                  {connections.signIn.provider === 'google' ? (
                    <GoogleMark className="h-5 w-5" />
                  ) : connections.signIn.provider === 'github' ? (
                    <GitHubMark className="h-5 w-5" />
                  ) : (
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-none">
                    {connections.signIn.provider === 'google'
                      ? t('googleProvider')
                      : connections.signIn.provider === 'github'
                        ? t('githubProvider')
                        : t('emailProvider')}
                  </p>
                  <p className="mt-1 break-all text-sm text-muted-foreground">
                    {connections.signIn.provider === 'google'
                      ? t('googleDescription')
                      : connections.signIn.provider === 'github'
                        ? t('githubDescription')
                        : t('emailDescription')}
                  </p>
                </div>
              </div>
              <Badge variant="success" className="break-all">
                {t('connectedAs', { account: connections.signIn.email })}
              </Badge>
            </CardContent>
          </Card>
        )}
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('cardTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3 border-b pb-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={t('avatarAlt')} />
                ) : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <FormField
                label={t('avatarLabel')}
                htmlFor="profile-avatar-upload"
                hint={t('avatarHint')}
              >
                <Input
                  id="profile-avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                />
              </FormField>
            </div>
            {customAvatarDataUrl && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCustomAvatarDataUrl('')}
              >
                {t('removeAvatar')}
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label={t('firstName')} htmlFor="profile-first-name">
              <Input
                id="profile-first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
              />
            </FormField>
            <FormField label={t('lastName')} htmlFor="profile-last-name">
              <Input
                id="profile-last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
              />
            </FormField>
          </div>

          <FormField label={t('email')} htmlFor="profile-email">
            <Input
              id="profile-email"
              type="email"
              value={email}
              readOnly
              aria-readonly="true"
              autoComplete="email"
            />
          </FormField>

          <FormField label={t('phone')} htmlFor="profile-phone">
            <Input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
            />
          </FormField>
        </CardContent>
      </Card>

      {/* id targeted by the "billing address" link on the orders page */}
      <Card id="billing-address" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="text-lg">{t('billingDetails')}</CardTitle>
          <CardDescription>{t('billingDetailsHint')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label={t('country')} htmlFor="profile-country">
            <Select
              id="profile-country"
              value={countryCode}
              onChange={(event) => setCountryCode(event.target.value)}
            >
              {countryOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>

        <FormField label={t('addressLine1')} htmlFor="profile-address-line-1">
          <Input
            id="profile-address-line-1"
            value={addressLine1}
            onChange={(event) => setAddressLine1(event.target.value)}
            autoComplete="address-line1"
          />
        </FormField>

        <FormField label={t('addressLine2')} htmlFor="profile-address-line-2">
          <Input
            id="profile-address-line-2"
            value={addressLine2}
            onChange={(event) => setAddressLine2(event.target.value)}
            autoComplete="address-line2"
          />
        </FormField>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField label={t('city')} htmlFor="profile-city">
            <Input
              id="profile-city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              autoComplete="address-level2"
            />
          </FormField>
          <FormField
            label={t(`regionLabels.${countryProfile.regionLabel}`)}
            htmlFor="profile-region"
          >
            <Input
              id="profile-region"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              autoComplete="address-level1"
            />
          </FormField>
          <FormField
            label={t(`postalLabels.${countryProfile.postalLabel}`)}
            htmlFor="profile-postal-code"
          >
            <Input
              id="profile-postal-code"
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
              autoComplete="postal-code"
            />
          </FormField>
        </div>

          <FormField
            label={t(`taxLabels.${countryProfile.taxLabel}`)}
            htmlFor="profile-tax-number"
          >
            <Input
              id="profile-tax-number"
              value={taxNumber}
              onChange={(event) => setTaxNumber(event.target.value)}
            />
          </FormField>
        </CardContent>
      </Card>

      {error && (
        <Alert tone="critical" role="alert">
          {error}
        </Alert>
      )}

      {success && (
        <Alert tone="positive" role="status">
          {success}
        </Alert>
      )}

      {/* Save bar: a quiet card-footer strip closing the form column. */}
      <div className="flex items-center justify-end gap-4 rounded-md border bg-card p-4 shadow-xs">
        <Button type="submit" disabled={saving}>
          {saving ? t('saving') : t('save')}
        </Button>
      </div>
      </form>
    </div>
  )
}
