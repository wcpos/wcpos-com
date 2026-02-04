import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('displays login form', async ({ page }) => {
      await page.goto('/login')

      await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
      await expect(page.getByLabel('Email')).toBeVisible()
      await expect(page.getByLabel('Password')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    })

    test('has link to register page', async ({ page }) => {
      await page.goto('/login')

      const registerLink = page.getByRole('link', { name: /sign up/i })
      await expect(registerLink).toBeVisible()
      await expect(registerLink).toHaveAttribute('href', '/register')
    })

    test('shows validation errors for empty form', async ({ page }) => {
      await page.goto('/login')

      await page.getByRole('button', { name: 'Sign in' }).click()

      // Should show validation errors (this depends on your form validation implementation)
      // Adjust these expectations based on your actual validation behavior
    })
  })

  test.describe('Register Page', () => {
    test('displays registration form', async ({ page }) => {
      await page.goto('/register')

      await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible()
      await expect(page.getByLabel('First name')).toBeVisible()
      await expect(page.getByLabel('Last name')).toBeVisible()
      await expect(page.getByLabel('Email')).toBeVisible()
      await expect(page.getByLabel('Password')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()
    })

    test('has link to login page', async ({ page }) => {
      await page.goto('/register')

      const loginLink = page.getByRole('link', { name: /sign in/i })
      await expect(loginLink).toBeVisible()
      await expect(loginLink).toHaveAttribute('href', '/login')
    })

    test('shows loading state during form submission', async ({ page }) => {
      await page.goto('/register')

      // Fill out the form
      await page.getByLabel('First name').fill('John')
      await page.getByLabel('Last name').fill('Doe')
      await page.getByLabel('Email').fill('john.doe@example.com')
      await page.getByLabel('Password').fill('password123')

      // Mock the API response to be slow
      await page.route('/api/auth/register', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        })
      })

      await page.getByRole('button', { name: 'Create account' }).click()

      // Should show loading state
      await expect(page.getByRole('button', { name: 'Creating account...' })).toBeVisible()
      await expect(page.getByRole('button')).toBeDisabled()
    })
  })

  test.describe('Navigation', () => {
    test('redirects to login when accessing protected routes', async ({ page }) => {
      await page.goto('/account')

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/)
    })
  })
})