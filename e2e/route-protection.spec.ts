import { expect, test, type Page } from '@playwright/test'
import { SignJWT } from 'jose'

const jwtSecret = new TextEncoder().encode('phase11-playwright-local-test-key-not-for-real-users')

async function sessionToken(role: string, expiresAt = Math.floor(Date.now() / 1000) + 300) {
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({ userId: 42, email: 'phase11-e2e@example.invalid', role, iat: now, exp: expiresAt })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject('42')
    .sign(jwtSecret)
}

async function signInAs(page: Page, role: string) {
  await page.context().addCookies([{
    name: 'apex_session',
    value: await sessionToken(role),
    url: 'http://127.0.0.1:3100',
    httpOnly: true,
    sameSite: 'Lax',
  }])
}

test('login page renders the real sign-in form and registration navigation', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByRole('heading', { name: 'Sign In to Apex Auto' })).toBeVisible()
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"]')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Register here' })).toHaveAttribute('href', '/register')
})

test('home page fits narrow mobile and tablet viewports without horizontal overflow', async ({ page }) => {
  await page.goto('/')

  for (const width of [360, 390, 768]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.getByRole('heading', { name: 'Vehicle Service & Maintenance' })).toBeVisible()

    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      cards: Array.from(document.querySelectorAll('.card')).map((card) => {
        const bounds = card.getBoundingClientRect()
        return { left: bounds.left, right: bounds.right }
      }),
    }))

    expect(layout.document, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(layout.viewport)
    expect(layout.cards.length).toBe(3)
    for (const card of layout.cards) {
      expect(card.left, `card starts outside viewport at ${width}px`).toBeGreaterThanOrEqual(0)
      expect(card.right, `card ends outside viewport at ${width}px`).toBeLessThanOrEqual(layout.viewport)
    }
  }
})

test('login controls expose a visible keyboard focus indicator', async ({ page }) => {
  await page.goto('/login')
  await page.keyboard.press('Tab')

  const focusedControl = page.locator(':focus')
  await expect(focusedControl).toHaveAttribute('type', 'email')
  await expect.poll(() => focusedControl.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid')
})

test('unauthenticated dashboard navigation redirects to login', async ({ page }) => {
  await page.goto('/dashboard/customer/bookings')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Sign In to Apex Auto' })).toBeVisible()
})

test('invalid and expired session cookies redirect to login', async ({ page }) => {
  await page.context().addCookies([{
    name: 'apex_session', value: 'not.a.valid.signature', url: 'http://127.0.0.1:3100', httpOnly: true,
  }])
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)

  await page.context().clearCookies()
  const expired = await sessionToken('CUSTOMER', Math.floor(Date.now() / 1000) - 60)
  await page.context().addCookies([{
    name: 'apex_session', value: expired, url: 'http://127.0.0.1:3100', httpOnly: true,
  }])
  await page.goto('/dashboard/admin')
  await expect(page).toHaveURL(/\/login$/)
})

test('customer is redirected away from provider and admin routes', async ({ page }) => {
  await signInAs(page, 'CUSTOMER')

  await page.goto('/dashboard/provider/bookings')
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Welcome to Apex Auto' })).toBeVisible()

  await page.goto('/dashboard/admin')
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Welcome to Apex Auto' })).toBeVisible()
})

test('provider can reach the provider queue and sees a safe data-load error without a database', async ({ page }) => {
  await signInAs(page, 'SERVICE_PROVIDER')
  await page.goto('/dashboard/provider/bookings')

  await expect(page).toHaveURL(/\/dashboard\/provider\/bookings$/)
  await expect(page.getByRole('heading', { name: 'Incoming booking requests' })).toBeVisible()
  await expect(page.locator('p[role="alert"]')).toHaveText('Pending service requests could not be loaded. Please try again.')
})

test('customer can reach their bookings page and sees a safe data-load error without a database', async ({ page }) => {
  await signInAs(page, 'CUSTOMER')
  await page.goto('/dashboard/customer/bookings')

  await expect(page).toHaveURL(/\/dashboard\/customer\/bookings$/)
  await expect(page.getByRole('heading', { name: 'Your bookings' })).toBeVisible()
  await expect(page.locator('p[role="alert"]')).toHaveText('Your bookings could not be loaded. Please try again.')
})

test('administrator can reach the admin dashboard and sees a safe data-load error without a database', async ({ page }) => {
  await signInAs(page, 'ADMIN')
  await page.goto('/dashboard/admin')

  await expect(page).toHaveURL(/\/dashboard\/admin$/)
  await expect(page.getByRole('heading', { name: 'Service center dashboard' })).toBeVisible()
  await expect(page.locator('p[role="alert"]')).toHaveText('Admin dashboard data could not be loaded. Please try again.')
})
