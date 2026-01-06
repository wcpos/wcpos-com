import { describe, it, expect, vi, beforeEach } from 'vitest'
import { proService } from './pro-service'
import { githubClient } from '../external/github-client'
import { licenseClient } from '../external/license-client'

// Mock the dependencies
vi.mock('../external/github-client', () => ({
  githubClient: {
    getLatestRelease: vi.fn(),
    getReleaseByTag: vi.fn(),
  },
}))

vi.mock('../external/license-client', () => ({
  licenseClient: {
    validateLicense: vi.fn(),
    activateLicense: vi.fn(),
    deactivateLicense: vi.fn(),
  },
}))

const mockProRelease = {
  tagName: 'v1.2.0',
  name: 'Version 1.2.0',
  body: 'Release notes for 1.2.0',
  publishedAt: '2026-01-05T10:00:00Z',
  assets: [
    {
      name: 'woocommerce-pos-pro.zip',
      url: 'https://api.github.com/repos/wcpos/woocommerce-pos-pro/releases/assets/123',
      browser_download_url: 'https://github.com/wcpos/woocommerce-pos-pro/releases/download/v1.2.0/woocommerce-pos-pro.zip',
      content_type: 'application/zip',
      size: 500000,
    },
  ],
}

describe('proService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUpdateInfo', () => {
    it('returns update info for pro plugin', async () => {
      vi.mocked(githubClient.getLatestRelease).mockResolvedValue(mockProRelease as never)

      const result = await proService.getUpdateInfo('1.0.0')

      expect(result.status).toBe(200)
      expect(result.data).toHaveProperty('version', '1.2.0')
      expect(result.data).toHaveProperty('name', 'Version 1.2.0')
      expect(result.data).toHaveProperty('downloadUrl')
    })

    it('returns 404 when no release found', async () => {
      vi.mocked(githubClient.getLatestRelease).mockResolvedValue(null)

      const result = await proService.getUpdateInfo('1.0.0')

      expect(result.status).toBe(404)
      expect(result.error).toBe('No release found')
    })
  })

  describe('getLicenseStatus', () => {
    it('returns license status from license client', async () => {
      vi.mocked(licenseClient.validateLicense).mockResolvedValue({
        status: 200,
        data: {
          activated: true,
          status: 'active',
          productName: 'WooCommerce POS Pro',
        },
      })

      const result = await proService.getLicenseStatus('TEST-KEY', 'https://mysite.com')

      expect(result.status).toBe(200)
      expect(result.data?.activated).toBe(true)
      expect(licenseClient.validateLicense).toHaveBeenCalledWith('TEST-KEY', 'https://mysite.com')
    })
  })

  describe('activateLicense', () => {
    it('activates license via license client', async () => {
      vi.mocked(licenseClient.activateLicense).mockResolvedValue({
        status: 200,
        data: {
          activated: true,
          status: 'active',
        },
      })

      const result = await proService.activateLicense('TEST-KEY', 'https://mysite.com')

      expect(result.status).toBe(200)
      expect(result.data?.activated).toBe(true)
    })
  })

  describe('deactivateLicense', () => {
    it('deactivates license via license client', async () => {
      vi.mocked(licenseClient.deactivateLicense).mockResolvedValue({
        status: 200,
        data: {
          activated: false,
          status: 'inactive',
        },
      })

      const result = await proService.deactivateLicense('TEST-KEY', 'https://mysite.com')

      expect(result.status).toBe(200)
      expect(result.data?.activated).toBe(false)
    })
  })

  describe('getDownloadUrl', () => {
    it('returns download URL for valid active license', async () => {
      vi.mocked(licenseClient.validateLicense).mockResolvedValue({
        status: 200,
        data: {
          activated: true,
          status: 'active',
        },
      })
      vi.mocked(githubClient.getLatestRelease).mockResolvedValue(mockProRelease as never)

      const result = await proService.getDownloadUrl('latest', 'VALID-KEY', 'https://mysite.com')

      expect(typeof result).toBe('string')
      expect(result).toContain('api.github.com')
    })

    it('returns error for inactive license', async () => {
      vi.mocked(licenseClient.validateLicense).mockResolvedValue({
        status: 200,
        data: {
          activated: false,
          status: 'inactive',
        },
      })

      const result = await proService.getDownloadUrl('latest', 'INACTIVE-KEY', 'https://mysite.com')

      expect(typeof result).toBe('object')
      if (typeof result === 'object') {
        expect(result.status).toBe(403)
        expect(result.error).toBe('License not active')
      }
    })

    it('returns error for expired license', async () => {
      vi.mocked(licenseClient.validateLicense).mockResolvedValue({
        status: 200,
        data: {
          activated: true,
          status: 'expired',
        },
      })

      const result = await proService.getDownloadUrl('latest', 'EXPIRED-KEY', 'https://mysite.com')

      expect(typeof result).toBe('object')
      if (typeof result === 'object') {
        expect(result.status).toBe(403)
        expect(result.error).toBe('License expired')
      }
    })

    it('returns error for invalid license', async () => {
      vi.mocked(licenseClient.validateLicense).mockResolvedValue({
        status: 404,
        error: 'License not found',
      })

      const result = await proService.getDownloadUrl('latest', 'INVALID-KEY', 'https://mysite.com')

      expect(typeof result).toBe('object')
      if (typeof result === 'object') {
        expect(result.status).toBe(404)
      }
    })
  })
})

