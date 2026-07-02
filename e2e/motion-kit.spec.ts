import { test, expect } from '@playwright/test'

/**
 * Smoke coverage for the motion-kit prototype route (ADR 0013). The kit's
 * behavioural contracts (gating, reduced motion, props) are unit-tested;
 * here we only prove the page ships: sections render, the lazy R3F scene
 * mounts a canvas (or its static fallback where headless WebGL is absent),
 * and a full-page screenshot is attached for evaluation.
 */

test.describe('motion kit prototype', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/motion-kit')
  })

  test('renders the kit evaluation sections', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'The motion kit' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'AmbientGradient' })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'DotOrbit' })
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Reveal' })).toBeVisible()
  })

  test('mounts the flagship spike burst near the viewport', async ({
    page,
  }) => {
    const burst = page.getByTestId('spike-burst')
    await expect(burst).toBeVisible()
    // lazy chunk + WebGL init, or the CSS fallback when WebGL is unavailable
    await expect(
      burst.locator('canvas').or(page.getByTestId('spike-burst-fallback'))
    ).toBeVisible({ timeout: 15000 })
  })

  test('renders the canvas primitives (or their fallbacks)', async ({
    page,
  }) => {
    await expect(page.getByTestId('dot-orbit').first()).toBeVisible()
    await expect(
      page
        .getByTestId('ambient-gradient')
        .or(page.getByTestId('ambient-gradient-fallback'))
        .first()
    ).toBeVisible()
  })

  test('full-page screenshot for evaluation', async ({ page }, testInfo) => {
    await expect(page.getByTestId('spike-burst')).toBeVisible()
    // let the lazy scene settle before capturing
    await page
      .getByTestId('spike-burst')
      .locator('canvas')
      .or(page.getByTestId('spike-burst-fallback'))
      .waitFor({ timeout: 15000 })
    const screenshot = await page.screenshot({ fullPage: true })
    await testInfo.attach('motion-kit', {
      body: screenshot,
      contentType: 'image/png',
    })
  })
})
