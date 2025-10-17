import { test, expect, type Page } from '@playwright/test'
import { faker } from '@faker-js/faker'

test.describe('Authentication', () => {
  test.describe('Sign In', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/sign-in')
    })

    test('should display sign in form', async ({ page }) => {
      // Check for email input
      await expect(page.getByTestId('email-input')).toBeVisible()

      // Check for password input
      await expect(page.getByTestId('password-input')).toBeVisible()

      // Check for submit button
      await expect(page.getByTestId('submit-button')).toBeVisible()
    })

    test('should show validation errors for empty form', async ({ page }) => {
      // Click submit without filling form
      await page.getByTestId('submit-button').click()

      // Browser native validation should prevent submission, or error message should appear
      // Most modern browsers show native validation, but if error message is shown:
      const errorElement = page.getByTestId('error-message')
      const isErrorVisible = await errorElement.isVisible().catch(() => false)

      // If no error element visible, form should still be on sign-in page
      if (!isErrorVisible) {
        await expect(page).toHaveURL(/.*sign-in/)
      }
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
      await expect(page.getByTestId('name-input')).toBeVisible()
      await expect(page.getByTestId('email-input')).toBeVisible()
      await expect(page.getByTestId('password-input')).toBeVisible()
      await expect(page.getByTestId('confirm-password-input')).toBeVisible()

      // Check for submit button
      await expect(page.getByTestId('submit-button')).toBeVisible()
    })

    test('should validate email format', async ({ page }) => {
      // Generate test data with faker
      const invalidEmail = faker.lorem.word() // Not a valid email format
      const validPassword = faker.internet.password({ length: 8 })

      // Enter invalid email and password
      await page.getByTestId('email-input').fill(invalidEmail)
      await page.getByTestId('password-input').fill(validPassword)

      await page.getByTestId('submit-button').click()

      // Should either show error message or stay on sign-up page due to validation
      const errorElement = page.getByTestId('error-message')
      const isErrorVisible = await errorElement.isVisible().catch(() => false)

      if (!isErrorVisible) {
        // Browser native validation should reject the form
        await expect(page).toHaveURL(/.*sign-up/)
      } else {
        // Or if custom validation is implemented
        await expect(errorElement).toBeVisible()
      }
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
  await page.getByTestId('email-input').fill(email)
  await page.getByTestId('password-input').fill(password)
  await page.getByTestId('submit-button').click()

  // Wait for navigation or success indicator
  await page.waitForURL(/^(?!.*sign-in).*$/) // Wait to navigate away from sign-in
}