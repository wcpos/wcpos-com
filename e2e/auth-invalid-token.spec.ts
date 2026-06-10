import { test, expect, type BrowserContext } from '@playwright/test'

/**
 * Regression specs for the invalid-token redirect bounce loop.
 *
 * The middleware treats medusa-token cookie presence as logged-in and
 * bounces /login back to /account; account pages bounce Medusa 401s back
 * toward /login. With an invalid token the two used to ping-pong forever.
 * The fix routes the 401 path through GET /api/auth/logout, which deletes
 * the bad cookie before landing on /login.
 *
 * The mock backend (e2e/mocks/server.mjs) returns 401 for any token that
 * does not match a persona, so `bogus` simulates an expired/revoked token.
 */

async function setInvalidToken(
  context: BrowserContext,
  baseURL: string | undefined
) {
  await context.addCookies([
    {
      name: 'medusa-token',
      value: 'bogus',
      url: baseURL ?? 'http://localhost:3000',
    },
  ])
}

async function medusaCookie(context: BrowserContext) {
  const cookies = await context.cookies()
  return cookies.find((cookie) => cookie.name === 'medusa-token')
}

test.describe('Invalid medusa-token recovery', () => {
  test('visiting /account lands on a usable login page and clears the cookie', async ({
    page,
    context,
    baseURL,
  }) => {
    await setInvalidToken(context, baseURL)

    await page.goto('/account')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled()
    expect(await medusaCookie(context)).toBeUndefined()
  })

  test('locale-prefixed account routes recover to the locale login page', async ({
    page,
    context,
    baseURL,
  }) => {
    await setInvalidToken(context, baseURL)

    await page.goto('/fr/account')

    await expect(page).toHaveURL(/\/fr\/login$/)
    await expect(page.getByLabel('Email')).toBeVisible()
    expect(await medusaCookie(context)).toBeUndefined()
  })

  test('visiting /login directly with an invalid token settles on the form', async ({
    page,
    context,
    baseURL,
  }) => {
    await setInvalidToken(context, baseURL)

    // Middleware bounces /login -> /account (cookie present), the account
    // layout 401s through the logout handler, and we settle on /login with
    // the cookie cleared instead of looping.
    await page.goto('/login')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByLabel('Email')).toBeVisible()
    expect(await medusaCookie(context)).toBeUndefined()
  })
})
