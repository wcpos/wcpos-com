import { test, expect } from '@playwright/test'

test.describe('Health Check API', () => {
  test('GET /api/health returns healthy status', async ({ request }) => {
    const response = await request.get('/api/health')

    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data.status).toBe('healthy')
    expect(data).toHaveProperty('timestamp')
    expect(data).toHaveProperty('version')
    expect(data).toHaveProperty('environment')
  })

  test('HEAD /api/health returns 200', async ({ request }) => {
    const response = await request.head('/api/health')

    expect(response.status()).toBe(200)
  })
})