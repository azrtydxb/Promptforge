import { test, expect, type Page } from '@playwright/test'

test.describe('Authentication', () => {
  test.describe('Sign In', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/sign-in')
    })

    test('should display sign in form', async ({ page }) => {
      // Check for email input
      await expect(page.getByLabel(/email/i)).toBeVisible()
      
      // Check for password input
      await expect(page.getByLabel(/password/i)).toBeVisible()
      
      // Check for submit button
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    })

    test('should show validation errors for empty form', async ({ page }) => {
      // Click submit without filling form
      await page.getByRole('button', { name: /sign in/i }).click()
      
      // Should show validation errors (implementation specific)
      // This is a placeholder - adjust based on actual validation behavior
      await expect(page.getByText(/required/i).first()).toBeVisible()
    })

    test('should navigate to sign up page', async ({ page }) => {
      // Look for sign up link
      const signUpLink = page.getByRole('link', { name: /sign up/i })
      await expect(signUpLink).toBeVisible()
      
      await signUpLink.click()
      await expect(page).toHaveURL(/.*sign-up/)
    })
  })

  test.describe('Sign Up', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/sign-up')
    })

    test('should display sign up form', async ({ page }) => {
      // Check for form fields
      await expect(page.getByLabel(/email/i)).toBeVisible()
      await expect(page.getByLabel(/password/i).first()).toBeVisible()
      
      // Check for submit button
      await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible()
    })

    test('should validate email format', async ({ page }) => {
      // Enter invalid email
      await page.getByLabel(/email/i).fill('invalid-email')
      await page.getByLabel(/password/i).first().fill('ValidPassword123!')
      
      await page.getByRole('button', { name: /sign up/i }).click()
      
      // Should show email validation error
      // Adjust selector based on actual implementation
      await expect(page.getByText(/valid email/i)).toBeVisible()
    })

    test('should navigate to sign in page', async ({ page }) => {
      // Look for sign in link
      const signInLink = page.getByRole('link', { name: /sign in/i })
      await expect(signInLink).toBeVisible()
      
      await signInLink.click()
      await expect(page).toHaveURL(/.*sign-in/)
    })
  })
})

// Helper function for authenticated tests
export async function login(page: Page, email: string, password: string) {
  await page.goto('/sign-in')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  
  // Wait for navigation or success indicator
  await page.waitForURL(/^(?!.*sign-in).*$/) // Wait to navigate away from sign-in
}