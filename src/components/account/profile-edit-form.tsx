'use client'

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail } from 'lucide-react'
import { GitHubMark, GoogleMark } from '@/components/auth/provider-marks'
import { getConnectedAvatarUrlFromMetadata } from '@/lib/avatar'
import { readAccountProfileMetadata } from '@/lib/customer-profile-metadata'

interface ProfileEditFormProps {
  customer: {
    email: string
    first_name?: string
    last_name?: string
    phone?: string
    metadata?: Record<string, unknown>
  }
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
type TaxLabelKey =
  | 'einTaxId'
  | 'gstHst'
  | 'vat'
  | 'abn'
  | 'nifVat'
  | 'partitaIva'
  | 'gst'
  | 'taxRegistration'

type CountryProfile = {
  regionLabel: RegionLabelKey
  postalLabel: PostalLabelKey
  taxLabel: TaxLabelKey
}

const COUNTRY_PROFILES: Record<string, CountryProfile> = {
  US: { regionLabel: 'state', postalLabel: 'zip', taxLabel: 'einTaxId' },
  CA: { regionLabel: 'province', postalLabel: 'postalCode', taxLabel: 'gstHst' },
  GB: { regionLabel: 'county', postalLabel: 'postcode', taxLabel: 'vat' },
  AU: { regionLabel: 'stateTerritory', postalLabel: 'postcode', taxLabel: 'abn' },
  DE: { regionLabel: 'state', postalLabel: 'postalCode', taxLabel: 'vat' },
  FR: { regionLabel: 'region', postalLabel: 'postalCode', taxLabel: 'vat' },
  ES: { regionLabel: 'province', postalLabel: 'postalCode', taxLabel: 'nifVat' },
  IT: { regionLabel: 'province', postalLabel: 'postalCode', taxLabel: 'partitaIva' },
  NL: { regionLabel: 'province', postalLabel: 'postalCode', taxLabel: 'vat' },
  NZ: { regionLabel: 'region', postalLabel: 'postcode', taxLabel: 'gst' },
  JP: { regionLabel: 'prefecture', postalLabel: 'postalCode', taxLabel: 'taxRegistration' },
}

const FALLBACK_COUNTRY_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT',
  'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI',
  'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY',
  'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
  'CO', 'CQ', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK',
  'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ',
  'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI',
  'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK',
  'HM', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ',
  'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM',
  'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR',
  'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH',
  'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV',
  'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO',
  'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL',
  'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU',
  'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL',
  'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD',
  'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV',
  'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG',
  'VI', 'VN', 'VU', 'WF', 'WS', 'XK', 'YE', 'YT', 'ZA', 'ZM', 'ZW',
]

function getCountryCodes(displayNames: Intl.DisplayNames | null): string[] {
  if (typeof Intl.supportedValuesOf === 'function') {
    try {
      const getSupportedValues = Intl.supportedValuesOf as (
        key: string
      ) => string[]
      return getSupportedValues('region').filter((code) =>
        /^[A-Z]{2}$/.test(code)
      )
    } catch {
      // fall through to generated list
    }
  }

  if (!displayNames) {
    return FALLBACK_COUNTRY_CODES
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const codes: string[] = []

  for (const first of alphabet) {
    for (const second of alphabet) {
      const code = `${first}${second}`
      const label = displayNames.of(code)
      if (label && label !== code) {
        codes.push(code)
      }
    }
  }

  return codes
}

function buildCountryOptions(locale: string): Array<[string, string]> {
  const displayNames =
    typeof Intl.DisplayNames === 'function'
      ? new Intl.DisplayNames([locale], { type: 'region' })
      : null

  const uniqueCodes = Array.from(new Set(getCountryCodes(displayNames)))
  const options = uniqueCodes
    .map((code) => [code, displayNames?.of(code) || code] as [string, string])
    .filter(([, label]) => Boolean(label))

  options.sort((a, b) => a[1].localeCompare(b[1], locale))
  return options
}

function getInitials(firstName: string, lastName: string, email: string): string {
  const first = firstName.trim().charAt(0)
  const last = lastName.trim().charAt(0)

  if (first || last) {
    return `${first}${last}`.toUpperCase()
  }

  return email.trim().charAt(0).toUpperCase() || 'U'
}

function getProfileDefaults(metadata: Record<string, unknown> | undefined): {
  oauthAvatarUrl: string
  customAvatarUrl: string
  customAvatarDataUrl: string
  countryCode: string
  addressLine1: string
  addressLine2: string
  city: string
  region: string
  postalCode: string
  taxNumber: string
} {
  const accountProfile = readAccountProfileMetadata(metadata)

  return {
    oauthAvatarUrl: getConnectedAvatarUrlFromMetadata(metadata),
    customAvatarUrl: accountProfile.avatarUrl,
    customAvatarDataUrl: accountProfile.avatarDataUrl,
    countryCode: accountProfile.countryCode,
    addressLine1: accountProfile.addressLine1,
    addressLine2: accountProfile.addressLine2,
    city: accountProfile.city,
    region: accountProfile.region,
    postalCode: accountProfile.postalCode,
    taxNumber: accountProfile.taxNumber,
  }
}

export function ProfileEditForm({
  customer,
  memberSince,
  connections,
}: ProfileEditFormProps) {
  const locale = useLocale()
  const t = useTranslations('account.profile')
  const metadataDefaults = getProfileDefaults(customer.metadata)
  const countryOptions = useMemo(() => buildCountryOptions(locale), [locale])

  const [email, setEmail] = useState(customer.email ?? '')
  const [firstName, setFirstName] = useState(customer.first_name ?? '')
  const [lastName, setLastName] = useState(customer.last_name ?? '')
  const [phone, setPhone] = useState(customer.phone ?? '')
  const [countryCode, setCountryCode] = useState(metadataDefaults.countryCode)
  const [addressLine1, setAddressLine1] = useState(metadataDefaults.addressLine1)
  const [addressLine2, setAddressLine2] = useState(metadataDefaults.addressLine2)
  const [city, setCity] = useState(metadataDefaults.city)
  const [region, setRegion] = useState(metadataDefaults.region)
  const [postalCode, setPostalCode] = useState(metadataDefaults.postalCode)
  const [taxNumber, setTaxNumber] = useState(metadataDefaults.taxNumber)
  const [customAvatarDataUrl, setCustomAvatarDataUrl] = useState(
    metadataDefaults.customAvatarDataUrl
  )
  const [customAvatarUrl, setCustomAvatarUrl] = useState(
    metadataDefaults.customAvatarUrl
  )
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const countryProfile =
    COUNTRY_PROFILES[countryCode] ?? COUNTRY_PROFILES.US


  const avatarUrl = useMemo(() => {
    return customAvatarDataUrl || customAvatarUrl || metadataDefaults.oauthAvatarUrl
  }, [customAvatarDataUrl, customAvatarUrl, metadataDefaults.oauthAvatarUrl])

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

    try {
      const response = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
          accountProfile: {
            avatarDataUrl: customAvatarDataUrl || null,
            avatarUrl: customAvatarUrl || null,
            countryCode,
            addressLine1,
            addressLine2: addressLine2 || null,
            city,
            region,
            postalCode,
            taxNumber: taxNumber || null,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('updateError'))
      }

      const updated = getProfileDefaults(data.customer?.metadata)

      setEmail(data.customer.email ?? '')
      setFirstName(data.customer.first_name ?? '')
      setLastName(data.customer.last_name ?? '')
      setPhone(data.customer.phone ?? '')
      setCountryCode(updated.countryCode || 'US')
      setAddressLine1(updated.addressLine1)
      setAddressLine2(updated.addressLine2)
      setCity(updated.city)
      setRegion(updated.region)
      setPostalCode(updated.postalCode)
      setTaxNumber(updated.taxNumber)
      setCustomAvatarDataUrl(updated.customAvatarDataUrl)
      setCustomAvatarUrl(updated.customAvatarUrl)
      setSuccess(t('updateSuccess'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('updateError'))
    } finally {
      setSaving(false)
    }
  }

  return (
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
              <div className="space-y-2">
                <Label htmlFor="profile-avatar-upload">
                  {t('avatarLabel')}
                </Label>
                <Input
                  id="profile-avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                />
                <p className="text-xs text-muted-foreground">
                  {t('avatarHint')}
                </p>
              </div>
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
            <div className="space-y-2">
              <Label htmlFor="profile-first-name">{t('firstName')}</Label>
              <Input
                id="profile-first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-last-name">{t('lastName')}</Label>
              <Input
                id="profile-last-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-email">{t('email')}</Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-phone">{t('phone')}</Label>
            <Input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
            />
          </div>
        </CardContent>
      </Card>

      {/* id targeted by the "billing address" link on the orders page */}
      <Card id="billing-address" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="text-lg">{t('billingDetails')}</CardTitle>
          <CardDescription>{t('billingDetailsHint')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
          <Label htmlFor="profile-country">{t('country')}</Label>
          <select
            id="profile-country"
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          >
            {countryOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-address-line-1">{t('addressLine1')}</Label>
          <Input
            id="profile-address-line-1"
            value={addressLine1}
            onChange={(event) => setAddressLine1(event.target.value)}
            autoComplete="address-line1"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-address-line-2">{t('addressLine2')}</Label>
          <Input
            id="profile-address-line-2"
            value={addressLine2}
            onChange={(event) => setAddressLine2(event.target.value)}
            autoComplete="address-line2"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="profile-city">{t('city')}</Label>
            <Input
              id="profile-city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              autoComplete="address-level2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-region">
              {t(`regionLabels.${countryProfile.regionLabel}`)}
            </Label>
            <Input
              id="profile-region"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              autoComplete="address-level1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-postal-code">
              {t(`postalLabels.${countryProfile.postalLabel}`)}
            </Label>
            <Input
              id="profile-postal-code"
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
              autoComplete="postal-code"
            />
          </div>
        </div>

          <div className="space-y-2">
            <Label htmlFor="profile-tax-number">
              {t(`taxLabels.${countryProfile.taxLabel}`)}
            </Label>
            <Input
              id="profile-tax-number"
              value={taxNumber}
              onChange={(event) => setTaxNumber(event.target.value)}
            />
          </div>
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
                <p className="mt-1 text-sm text-muted-foreground">
                  {connections.signIn.provider === 'google'
                    ? t('googleDescription')
                    : connections.signIn.provider === 'github'
                      ? t('githubDescription')
                      : t('emailDescription')}
                </p>
              </div>
              <div className="flex flex-none items-center gap-2">
                <Badge variant="success">
                  {t('connectedAs', { account: connections.signIn.email })}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <Button type="submit" disabled={saving}>
          {saving ? t('saving') : t('save')}
        </Button>
        {memberSince && (
          <span className="text-sm text-muted-foreground">
            {t('memberSince')} {memberSince}
          </span>
        )}
      </div>
    </form>
  )
}
