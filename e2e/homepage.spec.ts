import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display the homepage', async ({ page }) => {
    // The landing renders after the session check resolves.
    await expect(
      page.getByRole('heading', { level: 1, name: /craft perfect prompts/i })
    ).toBeVisible({ timeout: 15000 })
  })

  test('should have working navigation links', async ({ page }) => {
    // "Sign In" is a button that routes to /sign-in
    const signIn = page.getByRole('button', { name: /sign in/i }).first()
    await expect(signIn).toBeVisible({ timeout: 15000 })

    await signIn.click()
    await expect(page).toHaveURL(/.*sign-in/)
  })

  test('should be responsive', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page.locator('body')).toBeVisible()

    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('body')).toBeVisible()
  })

  test('should have proper meta tags', async ({ page }) => {
    await expect(page).toHaveTitle(/Promptforge/i, { timeout: 15000 })

    const metaDescription = page.locator('meta[name="description"]')
    await expect(metaDescription).toHaveAttribute('content', /./)
  })
})
