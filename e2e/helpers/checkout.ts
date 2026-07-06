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

export async function completeBillingStep(page: Page) {
  await expect(page.getByTestId('billing-step-form')).toBeVisible({
    timeout: 15000,
  })
  await fillLabeledField(page, 'First name', 'Ada')
  await fillLabeledField(page, 'Last name', 'Lovelace')
  await fillLabeledField(page, 'Address line 1', '42 Wallaby Way')
  await fillLabeledField(page, 'Address line 2', 'Apt 7')
  await fillLabeledField(page, 'City', 'Sydney')
  await fillLabeledField(page, 'State / Province / Region', 'NSW')
  await fillLabeledField(page, 'Postal code', '2000')
  await selectLabeledOption(page, 'Country', 'au')
  await page.getByRole('button', { name: /continue to payment/i }).click()
  await expect(page.getByTestId('checkout-step-3')).toHaveAttribute(
    'data-step-state',
    'active',
    { timeout: 15000 }
  )
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
