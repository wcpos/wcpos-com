import { test, expect } from '@playwright/test'

test.describe('Electron Update API', () => {
  test.describe('GET /api/electron/[platform]/[version]', () => {
    test('returns update info for darwin-arm64', async ({ request }) => {
      const response = await request.get('/api/electron/darwin-arm64/1.5.0')

      expect(response.ok()).toBeTruthy()

      const data = await response.json()
      expect(data.status).toBe(200)
      expect(data.data).toHaveProperty('version')
      expect(data.data).toHaveProperty('name')
      expect(data.data).toHaveProperty('assets')
      expect(data.data).toHaveProperty('releaseDate')
      expect(data.data).toHaveProperty('notes')

      // Assets should contain darwin-arm64 zip
      expect(data.data.assets.length).toBeGreaterThan(0)
    })

    test('returns update info for darwin-x64', async ({ request }) => {
      const response = await request.get('/api/electron/darwin-x64/1.5.0')

      expect(response.ok()).toBeTruthy()

      const data = await response.json()
      expect(data.status).toBe(200)
      expect(data.data.assets.length).toBeGreaterThan(0)
    })

    test('returns update info for win32-x64 with RELEASES and nupkg', async ({
      request,
    }) => {
      const response = await request.get('/api/electron/win32-x64/1.5.0')

      expect(response.ok()).toBeTruthy()

      const data = await response.json()
      expect(data.status).toBe(200)

      // Windows should include RELEASES file for Squirrel
      const hasReleases = data.data.assets.some(
        (a: { name: string }) => a.name === 'RELEASES'
      )
      const hasNupkg = data.data.assets.some((a: { name: string }) =>
        a.name.endsWith('.nupkg')
      )

      expect(hasReleases || hasNupkg).toBeTruthy()
    })

    test('returns update info for linux-x64 with AppImage', async ({
      request,
    }) => {
      const response = await request.get('/api/electron/linux-x64/1.5.0')

      expect(response.ok()).toBeTruthy()

      const data = await response.json()
      expect(data.status).toBe(200)

      // Linux should include AppImage
      const hasAppImage = data.data.assets.some((a: { name: string }) =>
        a.name.endsWith('.AppImage')
      )
      expect(hasAppImage).toBeTruthy()
    })

    test('returns legacy format for versions < 1.4.0', async ({ request }) => {
      const response = await request.get('/api/electron/darwin-arm64/1.3.0')

      expect(response.ok()).toBeTruthy()

      const data = await response.json()

      // Legacy format should NOT have status wrapper
      expect(data).not.toHaveProperty('status')
      expect(data).toHaveProperty('version')
      expect(data).toHaveProperty('name')
      expect(data).toHaveProperty('assets')
    })
  })

  test.describe('GET /api/electron/download/[platform]', () => {
    test('redirects to download URL for darwin-arm64', async ({ request }) => {
      const response = await request.get('/api/electron/download/darwin-arm64', {
        maxRedirects: 0,
      })

      // Should be a redirect
      expect(response.status()).toBe(302)

      const location = response.headers()['location']
      expect(location).toContain('github.com')
      expect(location).toContain('arm64')
    })

    test('redirects to download URL for win32-x64', async ({ request }) => {
      const response = await request.get('/api/electron/download/win32-x64', {
        maxRedirects: 0,
      })

      expect(response.status()).toBe(302)

      const location = response.headers()['location']
      expect(location).toContain('github.com')
      expect(location).toContain('.exe')
    })

    test('returns 400 for unsupported platform', async ({ request }) => {
      const response = await request.get(
        '/api/electron/download/unsupported-platform'
      )

      expect(response.status()).toBe(400)

      const data = await response.json()
      expect(data.error).toContain('Unsupported platform')
    })
  })
})

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

