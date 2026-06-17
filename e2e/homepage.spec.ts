import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('displays the hero heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'Your WooCommerce products, ready to sell in-store',
      })
    ).toBeVisible()
  })

  test('displays the tagline', async ({ page }) => {
    await expect(
      page.getByText('Point of Sale for WooCommerce')
    ).toBeVisible()
  })

  test('links the demo CTA to the live demo', async ({ page }) => {
    // The demo CTA appears in both the hero and the closing CTA section
    const demoLinks = page.getByRole('link', { name: 'Try Live Demo' })
    await expect(demoLinks.first()).toBeVisible()
    for (const link of await demoLinks.all()) {
      await expect(link).toHaveAttribute('href', 'https://demo.wcpos.com/pos')
    }
  })

  test('links the download CTAs to their intended targets', async ({
    page,
  }) => {
    const downloadLinks = page.getByRole('link', { name: 'Download Free' })
    await expect(downloadLinks).toHaveCount(2)
    await expect(downloadLinks.first()).toHaveAttribute(
      'href',
      'https://wordpress.org/plugins/woocommerce-pos/'
    )
    await expect(downloadLinks.nth(1)).toHaveAttribute('href', '/downloads')
  })

  test('renders the marketing sections', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Why stores choose WCPOS' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', {
        name: 'Ready to sell in-store with WooCommerce?',
      })
    ).toBeVisible()
  })
})
