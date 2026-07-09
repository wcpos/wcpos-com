'use client'

import { useMemo, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useRouter, usePathname } from '@/i18n/navigation'
import { locales, localeNames, type Locale } from '@/i18n/config'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Camera, ImagePlus, Trash2 } from 'lucide-react'
import {
  ConnectionsCard,
  type ConnectionsCardProps,
} from '@/components/account/connections-card'
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
    signIn: ConnectionsCardProps['signIn']
    /** DB truth from the auth-methods endpoint; absent → read-only card. */
    methods?: ConnectionsCardProps['methods']
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

/** Everything one autosave asserts, captured at trigger time. */
type FormSnapshot = {
  firstName: string
  lastName: string
  phone: string
  countryCode: string
  addressLine1: string
  addressLine2: string
  city: string
  region: string
  postalCode: string
  taxNumber: string
  avatarDataUrl: string
  avatarUrl: string
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

  // Last server-confirmed values, used to decide whether a blur actually has
  // something to save. Refs (not state): dirty checks happen inside the async
  // save pipeline, and a queued save must see the baseline its predecessor
  // just committed, not the one captured at render time. Comparisons use
  // trimmed values because the server trims — otherwise a value like "Paul "
  // would re-save (and re-toast) on every subsequent blur.
  const profileBaselineRef = useRef({
    firstName: (customer.first_name ?? '').trim(),
    lastName: (customer.last_name ?? '').trim(),
    phone: (customer.phone ?? '').trim(),
  })
  const billingBaselineRef = useRef(savedBilling)
  const avatarBaselineRef = useRef({
    avatarDataUrl: avatarDefaults.customAvatarDataUrl,
    avatarUrl: avatarDefaults.customAvatarUrl,
  })

  // Saves are serialized: one request in flight, at most one (latest-wins)
  // snapshot queued behind it, so rapid blurs can't race each other.
  const inFlightRef = useRef(false)
  const pendingSnapshotRef = useRef<FormSnapshot | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const countryProfile =
    COUNTRY_PROFILES[countryCode] ?? COUNTRY_PROFILES.US


  const avatarUrl = useMemo(() => {
    return customAvatarDataUrl || customAvatarUrl || avatarDefaults.oauthAvatarUrl
  }, [customAvatarDataUrl, customAvatarUrl, avatarDefaults.oauthAvatarUrl])

  const hasCustomAvatar = Boolean(customAvatarDataUrl || customAvatarUrl)
  const initials = getInitials(firstName, lastName, email)

  // Overrides cover values that changed in the same event that triggers the
  // save (avatar picks, the country select), where React state hasn't
  // re-rendered yet.
  function collectSnapshot(overrides?: Partial<FormSnapshot>): FormSnapshot {
    return {
      firstName,
      lastName,
      phone,
      countryCode,
      addressLine1,
      addressLine2,
      city,
      region,
      postalCode,
      taxNumber,
      avatarDataUrl: customAvatarDataUrl,
      avatarUrl: customAvatarUrl,
      ...overrides,
    }
  }

  function requestSave(overrides?: Partial<FormSnapshot>) {
    void runSave(collectSnapshot(overrides))
  }

  async function runSave(snapshot: FormSnapshot) {
    if (inFlightRef.current) {
      pendingSnapshotRef.current = snapshot
      return
    }

    const profileBaseline = profileBaselineRef.current
    const nextProfile = {
      firstName: snapshot.firstName.trim(),
      lastName: snapshot.lastName.trim(),
      phone: snapshot.phone.trim(),
    }
    const profileChanged =
      nextProfile.firstName !== profileBaseline.firstName ||
      nextProfile.lastName !== profileBaseline.lastName ||
      nextProfile.phone !== profileBaseline.phone

    const billingBaseline = billingBaselineRef.current
    const billingContentChanged =
      snapshot.addressLine1.trim() !== billingBaseline.addressLine1 ||
      snapshot.addressLine2.trim() !== billingBaseline.addressLine2 ||
      snapshot.city.trim() !== billingBaseline.city ||
      snapshot.region.trim() !== billingBaseline.region ||
      snapshot.postalCode.trim() !== billingBaseline.postalCode ||
      snapshot.taxNumber.trim() !== billingBaseline.taxNumber
    // A country change with no address content anywhere mirrors the server's
    // rule (upsertDefaultBillingAddress): a bare country never creates an
    // address record, so saving it would toast success while persisting
    // nothing — and then re-send forever. The selection stays local until
    // the user adds actual address content.
    const billingHasAnyContent =
      Boolean(
        snapshot.addressLine1.trim() ||
          snapshot.addressLine2.trim() ||
          snapshot.city.trim() ||
          snapshot.region.trim() ||
          snapshot.postalCode.trim() ||
          snapshot.taxNumber.trim()
      ) ||
      Boolean(
        billingBaseline.addressLine1 ||
          billingBaseline.addressLine2 ||
          billingBaseline.city ||
          billingBaseline.region ||
          billingBaseline.postalCode ||
          billingBaseline.taxNumber
      )
    const billingChanged =
      billingContentChanged ||
      (snapshot.countryCode !== billingBaseline.countryCode &&
        billingHasAnyContent)

    const avatarBaseline = avatarBaselineRef.current
    const avatarChanged =
      snapshot.avatarDataUrl !== avatarBaseline.avatarDataUrl ||
      snapshot.avatarUrl !== avatarBaseline.avatarUrl

    // Blur fires on every focus move through the form; only real edits save
    // (and toast).
    if (!profileChanged && !billingChanged && !avatarChanged) return

    inFlightRef.current = true

    try {
      const response = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Each section is asserted only when it changed: an untouched
          // billing form must not write (or create) an address record, and
          // a name edit must not re-send a ~1MB avatar data URL.
          ...(profileChanged
            ? {
                first_name: nextProfile.firstName,
                last_name: nextProfile.lastName,
                phone: nextProfile.phone,
              }
            : {}),
          ...(avatarChanged
            ? {
                avatar: {
                  avatarDataUrl: snapshot.avatarDataUrl || null,
                  avatarUrl: snapshot.avatarUrl || null,
                },
              }
            : {}),
          ...(billingChanged
            ? {
                billingAddress: {
                  countryCode: snapshot.countryCode,
                  addressLine1: snapshot.addressLine1,
                  addressLine2: snapshot.addressLine2 || null,
                  city: snapshot.city,
                  region: snapshot.region,
                  postalCode: snapshot.postalCode,
                  taxNumber: snapshot.taxNumber || null,
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

      // Advance the baselines to the server-confirmed values but leave the
      // live field state alone — the user may already be typing in the next
      // field, and clobbering it with the response would eat keystrokes.
      profileBaselineRef.current = {
        firstName: (data.customer?.first_name ?? '').trim(),
        lastName: (data.customer?.last_name ?? '').trim(),
        phone: (data.customer?.phone ?? '').trim(),
      }
      const updatedAvatar = getAvatarDefaults(data.customer?.metadata)
      avatarBaselineRef.current = {
        avatarDataUrl: updatedAvatar.customAvatarDataUrl,
        avatarUrl: updatedAvatar.customAvatarUrl,
      }
      const updatedBilling = (data.billingDetails ?? {}) as Partial<BillingDetails>
      billingBaselineRef.current = {
        countryCode: updatedBilling.countryCode || 'US',
        addressLine1: updatedBilling.addressLine1 ?? '',
        addressLine2: updatedBilling.addressLine2 ?? '',
        city: updatedBilling.city ?? '',
        region: updatedBilling.region ?? '',
        postalCode: updatedBilling.postalCode ?? '',
        taxNumber: updatedBilling.taxNumber ?? '',
      }

      toast.success(t('updateSuccess'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('updateError'))
    } finally {
      inFlightRef.current = false
      const queued = pendingSnapshotRef.current
      if (queued) {
        pendingSnapshotRef.current = null
        void runSave(queued)
      }
    }
  }

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const file = input.files?.[0]
    // Reset so picking the same file again still fires a change event.
    input.value = ''
    if (!file) return

    if (file.size > 1024 * 1024) {
      toast.error(t('avatarTooLarge'))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (!result.startsWith('data:image/')) {
        toast.error(t('avatarInvalid'))
        return
      }

      setCustomAvatarDataUrl(result)
      setCustomAvatarUrl('')
      requestSave({ avatarDataUrl: result, avatarUrl: '' })
    }
    reader.readAsDataURL(file)
  }

  const handleAvatarRemove = () => {
    setCustomAvatarDataUrl('')
    setCustomAvatarUrl('')
    requestSave({ avatarDataUrl: '', avatarUrl: '' })
  }

  // The form autosaves: field blurs (React's onBlur is focusout, so it
  // bubbles here from every field) and Enter both funnel into the same
  // dirty-checked save.
  const handleFormBlur = () => {
    requestSave()
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    requestSave()
  }

  // Enter must save explicitly: with several text fields and no submit
  // button, browsers suppress implicit form submission, so onSubmit alone
  // never fires from the keyboard.
  const handleFormKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Enter') return
    if (event.target instanceof HTMLInputElement) {
      event.preventDefault()
      requestSave()
    }
  }

  return (
    // 2fr/3fr, not a fixed rail: the identity rail grows wide enough for the
    // Connections rows (avatar + email on its own line + Disconnect), while
    // the billing/address column stays the wider of the two at every viewport.
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_3fr]">
      {/* Identity rail: who you are + account-level settings. Everything
          here is either display-only or self-saving (language), so it lives
          outside the profile <form>. */}
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-1 pt-6 text-center">
            {/* The avatar is the edit affordance: clicking it opens the
                photo menu; picking or removing a photo saves immediately. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t('avatarEdit')}
                  className="group relative rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Avatar className="h-16 w-16">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt={t('avatarAlt')} />
                    ) : null}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 group-data-[state=open]:opacity-100"
                  >
                    <Camera className="h-5 w-5 text-background" />
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem
                  onSelect={() => fileInputRef.current?.click()}
                >
                  <ImagePlus />
                  {t('uploadPhoto')}
                </DropdownMenuItem>
                {hasCustomAvatar && (
                  <DropdownMenuItem onSelect={handleAvatarRemove}>
                    <Trash2 />
                    {t('removePhoto')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <input
              ref={fileInputRef}
              id="profile-avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
              onChange={handleAvatarFileChange}
            />
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
          <ConnectionsCard
            signIn={connections.signIn}
            methods={connections.methods}
          />
        )}
      </div>

      <form
        className="space-y-6"
        onSubmit={handleSubmit}
        onBlur={handleFormBlur}
        onKeyDown={handleFormKeyDown}
      >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('cardTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
              onChange={(event) => {
                // A select is a discrete choice — save on change rather than
                // waiting for focus to leave it.
                const next = event.target.value
                setCountryCode(next)
                requestSave({ countryCode: next })
              }}
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

      </form>
    </div>
  )
}
