import { test, expect, type Page } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill('alex@growth.co')
  await page.getByLabel('Password').fill('promptforge')
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('sign-in'), { timeout: 30000 })
}

test.describe('Agent Personas', () => {
  test.setTimeout(240_000)
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('lists personas and creates one', async ({ page }) => {
    const name = `E2E Persona ${Date.now()}`

    await page.goto('/personas')
    await expect(
      page.getByRole('heading', { name: 'Agent Personas' })
    ).toBeVisible()

    await page.getByRole('button', { name: 'New persona' }).first().click()
    await page.waitForURL(/\/personas\/new/)

    await page.locator('#persona-name').fill(name)
    await page.locator('#persona-role').fill('QA Bot')
    await page.locator('#persona-tone').fill('Concise')
    await page
      .locator('textarea')
      .last()
      .fill('You are a meticulous QA assistant. Verify every claim.')

    await page.getByRole('button', { name: 'Create persona' }).click()
    await page.waitForURL(
      (u) => u.pathname.startsWith('/personas/') && u.pathname !== '/personas/new',
      { timeout: 30000 }
    )

    // Detail page shows the persona name in the topbar title
    await expect(page.getByText(name).first()).toBeVisible()

    // It appears in the list too
    await page.goto('/personas')
    await expect(page.getByText(name).first()).toBeVisible()
  })

  test('assigns a persona to a prompt and persists it', async ({ page }) => {
    const name = `E2E Assign ${Date.now()}`

    // Create the persona
    await page.goto('/personas/new')
    await page.locator('#persona-name').fill(name)
    await page
      .locator('textarea')
      .last()
      .fill('You are a helpful assistant for assignment testing.')
    await page.getByRole('button', { name: 'Create persona' }).click()
    await page.waitForURL(
      (u) => u.pathname.startsWith('/personas/') && u.pathname !== '/personas/new',
      { timeout: 30000 }
    )
    const personaUrl = page.url()

    // Open the first personal prompt
    await page.goto('/prompts')
    await page.getByRole('button', { name: 'Open' }).first().click()
    await page.waitForURL(/\/prompts\/[^/]+$/, { timeout: 60000 })
    const promptUrl = page.url()

    // Assign the persona via the rail select and confirm it persists across a
    // fresh load. Retry the whole cycle to tolerate hydration/compile latency.
    let persisted = false
    for (let attempt = 0; attempt < 6 && !persisted; attempt++) {
      await page.goto(promptUrl)
      const select = page.locator('select', {
        has: page.locator('option', { hasText: name }),
      })
      const ready = await select
        .waitFor({ state: 'visible', timeout: 25000 })
        .then(() => true)
        .catch(() => false)
      if (!ready) continue

      await select.selectOption({ label: name })
      // Give the server action time to commit before reloading.
      await page.waitForTimeout(4000)

      await page.reload()
      const after = page.locator('select', {
        has: page.locator('option', { hasText: name }),
      })
      const afterReady = await after
        .waitFor({ state: 'visible', timeout: 25000 })
        .then(() => true)
        .catch(() => false)
      if (!afterReady) continue

      const checked = (
        (await after.locator('option:checked').textContent()) ?? ''
      ).trim()
      persisted = checked === name
    }
    expect(persisted).toBe(true)

    // Cleanup
    page.on('dialog', (d) => d.accept())
    await page.goto(personaUrl)
    await page.getByRole('button', { name: 'Delete' }).click()
    await page.waitForURL(/\/personas$/, { timeout: 30000 })
  })

  test('edits and deletes a persona', async ({ page }) => {
    const name = `E2E Edit ${Date.now()}`

    await page.goto('/personas/new')
    await page.locator('#persona-name').fill(name)
    await page
      .locator('textarea')
      .last()
      .fill('You are a persona created for the edit/delete test.')
    await page.getByRole('button', { name: 'Create persona' }).click()
    await page.waitForURL(
      (u) => u.pathname.startsWith('/personas/') && u.pathname !== '/personas/new',
      { timeout: 30000 }
    )
    const personaUrl = page.url()

    // Edit the role and save
    await page.locator('#persona-role').fill('Edited Role')
    await page.getByRole('button', { name: 'Save changes' }).click()

    // Delete (accept the confirm dialog)
    page.on('dialog', (d) => d.accept())
    await page.getByRole('button', { name: 'Delete' }).click()
    await page.waitForURL(/\/personas$/, { timeout: 30000 })

    await page.goto('/personas')
    await expect(page.getByText(name)).toHaveCount(0)
  })
})
