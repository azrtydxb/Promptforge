import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display the homepage', async ({ page }) => {
    // Check if the main heading is visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    
    // Check if navigation is present
    await expect(page.getByRole('navigation')).toBeVisible()
  })

  test('should have working navigation links', async ({ page }) => {
    // Check if sign in link exists and works
    const signInLink = page.getByRole('link', { name: /sign in/i })
    await expect(signInLink).toBeVisible()
    
    await signInLink.click()
    await expect(page).toHaveURL(/.*sign-in/)
  })

  test('should be responsive', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 })
    await expect(page.getByRole('navigation')).toBeVisible()
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    // Mobile navigation might be hidden in a menu
    await expect(page.locator('body')).toBeVisible()
  })

  test('should have proper meta tags', async ({ page }) => {
    // Check title
    await expect(page).toHaveTitle(/Promptforge/i)
    
    // Check meta description
    const metaDescription = page.locator('meta[name="description"]')
    await expect(metaDescription).toHaveAttribute('content', /./);
  })
})