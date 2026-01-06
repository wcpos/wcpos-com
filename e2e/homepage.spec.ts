import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('displays WooCommerce POS heading', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'WooCommerce POS' })).toBeVisible()
  })

  test('displays tagline', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('Point of Sale for WooCommerce')).toBeVisible()
  })

  test('has link to API health check', async ({ page }) => {
    await page.goto('/')

    const healthLink = page.getByRole('link', { name: 'API Health Check' })
    await expect(healthLink).toBeVisible()
    await expect(healthLink).toHaveAttribute('href', '/api/health')
  })

  test('health check link works', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: 'API Health Check' }).click()

    // Should navigate to the health endpoint
    await expect(page).toHaveURL(/\/api\/health/)
  })
})

