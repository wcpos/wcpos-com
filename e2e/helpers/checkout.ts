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

export async function completeBillingStep(page: Page) {
  await expect(page.getByTestId('billing-step-form')).toBeVisible({
    timeout: 15000,
  })
  await page.getByLabel('First name').fill('Ada')
  await page.getByLabel('Last name').fill('Lovelace')
  await page.getByLabel('Address').fill('42 Wallaby Way')
  await page.getByLabel('City').fill('Sydney')
  await page.getByLabel('Postal code').fill('2000')
  await page.getByLabel('Country').selectOption('au')
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
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page
    .getByRole('button', { name: /create account & continue/i })
    .click()
  await expect(page.getByTestId('checkout-step-2')).toHaveAttribute(
    'data-step-state',
    'active',
    { timeout: 15000 }
  )
}
