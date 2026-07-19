import { expect } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'

/** Shared helpers for the mocked checkout specs. */

// wcpos-pro-yearly + variant_e2e_yearly resolve to the current WCPOS Pro
// Yearly offer ($129.00) in e2e/mocks/fixtures.json.
export const YEARLY_CHECKOUT_PATH =
  '/pro/checkout?product=wcpos-pro-yearly&variant=variant_e2e_yearly'

export const MOCK_BACKEND_URL = `http://127.0.0.1:${Number(
  process.env.E2E_MOCK_PORT || 4873
)}`

export interface CheckoutBillingFixture {
  firstName: string
  lastName: string
  company?: string
  addressLine1: string
  addressLine2?: string
  city: string
  region?: string
  postalCode: string
  countryCode: string
  taxNumber?: string
}

const DEFAULT_BILLING_FIXTURE: CheckoutBillingFixture = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  addressLine1: '42 Wallaby Way',
  addressLine2: 'Apt 7',
  city: 'Sydney',
  region: 'NSW',
  postalCode: '2000',
  countryCode: 'au',
}

export async function signInAs(
  context: BrowserContext,
  baseURL: string | undefined,
  token: string
) {
  await context.addCookies([
    {
      name: 'medusa-token',
      value: token,
      url: baseURL ?? 'http://localhost:3000',
    },
  ])
}

export async function openYearlyCheckout(page: Page) {
  await page.goto(YEARLY_CHECKOUT_PATH)
  await expect(page.getByTestId('checkout-steps')).toBeVisible({
    timeout: 15000,
  })
}

async function fillLabeledField(page: Page, label: string, value: string) {
  let lastError: unknown

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const field = page.getByLabel(label)
    try {
      await expect(field).toBeVisible({ timeout: 5000 })
      await field.fill(value, { timeout: 5000 })
      await expect(field).toHaveValue(value, { timeout: 5000 })
      return
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}

async function selectLabeledOption(page: Page, label: string, value: string) {
  let lastError: unknown

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const field = page.getByLabel(label)
    try {
      await expect(field).toBeVisible({ timeout: 5000 })
      await field.selectOption(value, { timeout: 5000 })
      await expect(field).toHaveValue(value, { timeout: 5000 })
      return
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}

async function fillOptionalField(
  page: Page,
  selector: string,
  value: string | undefined
) {
  const field = page.locator(selector)
  await expect(field).toBeVisible({ timeout: 5000 })
  if (value === undefined) {
    await field.clear({ timeout: 5000 })
    await expect(field).toHaveValue('', { timeout: 5000 })
    return
  }

  await field.fill(value, { timeout: 5000 })
  await expect(field).toHaveValue(value, { timeout: 5000 })
}

export async function completeBillingStep(
  page: Page,
  fixture: CheckoutBillingFixture = DEFAULT_BILLING_FIXTURE
) {
  await expect(page.getByTestId('billing-step-form')).toBeVisible({
    timeout: 15000,
  })
  await fillBillingAddressFields(page, fixture)
  await page.getByRole('button', { name: /continue to payment/i }).click()
  await expect(page.getByTestId('checkout-step-3')).toHaveAttribute(
    'data-step-state',
    'active',
    { timeout: 15000 }
  )
}

export async function fillBillingAddressFields(
  page: Page,
  fixture: CheckoutBillingFixture = DEFAULT_BILLING_FIXTURE
) {
  await selectLabeledOption(page, 'Country', fixture.countryCode)
  await fillOptionalField(page, '#billing-company', fixture.company)
  await fillLabeledField(page, 'First name', fixture.firstName)
  await fillLabeledField(page, 'Last name', fixture.lastName)
  await fillLabeledField(page, 'Address line 1', fixture.addressLine1)
  await fillOptionalField(page, '#billing-address-line-2', fixture.addressLine2)
  await fillLabeledField(page, 'City', fixture.city)
  await fillOptionalField(page, '#billing-province', fixture.region)
  await fillLabeledField(page, 'Postal code', fixture.postalCode)
  await fillOptionalField(page, '#billing-tax-number', fixture.taxNumber)
}

export async function completeAccountStep(
  page: Page,
  email: string,
  password: string
) {
  await expect(page.getByTestId('account-step-form')).toBeVisible({
    timeout: 15000,
  })
  await fillLabeledField(page, 'Email', email)
  await fillLabeledField(page, 'Password', password)
  await page
    .getByRole('button', { name: /create account & continue/i })
    .click()
  await expect(page.getByTestId('checkout-step-2')).toHaveAttribute(
    'data-step-state',
    'active',
    { timeout: 15000 }
  )
}
