import { describe, it, expect, vi, beforeEach } from 'vitest'
import { electronService } from './electron-service'
import { githubClient } from '../external/github-client'
import { mockRelease } from '@/test/mocks/github'

// Mock the github client
vi.mock('../external/github-client', () => ({
  githubClient: {
    getLatestRelease: vi.fn(),
    getReleaseByTag: vi.fn(),
  },
}))

describe('electronService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getLatestUpdate', () => {
    it('returns update info with status wrapper for modern versions (>= 1.4.0)', async () => {
      vi.mocked(githubClient.getLatestRelease).mockResolvedValue(mockRelease)

      const result = await electronService.getLatestUpdate('darwin-arm64', '1.5.0')

      expect(result).toHaveProperty('status', 200)
      expect(result).toHaveProperty('data')
      
      if ('data' in result) {
        expect(result.data.version).toBe('1.8.2')
        expect(result.data.assets).toHaveLength(1) // Only darwin-arm64 zip
        expect(result.data.assets[0].name).toContain('darwin-arm64')
      }
    })

    it('returns flat response for legacy versions (< 1.4.0)', async () => {
      vi.mocked(githubClient.getLatestRelease).mockResolvedValue(mockRelease)

      const result = await electronService.getLatestUpdate('darwin-arm64', '1.3.0')

      // Legacy format should not have status wrapper
      expect(result).not.toHaveProperty('status')
      expect(result).toHaveProperty('version', '1.8.2')
      expect(result).toHaveProperty('assets')
    })

    it('returns 404 when no release is found', async () => {
      vi.mocked(githubClient.getLatestRelease).mockResolvedValue(null)

      const result = await electronService.getLatestUpdate('darwin-arm64', '1.5.0')

      expect(result).toEqual({ status: 404, error: 'No release found' })
    })

    it('filters assets correctly for Windows platform', async () => {
      vi.mocked(githubClient.getLatestRelease).mockResolvedValue(mockRelease)

      const result = await electronService.getLatestUpdate('win32-x64', '1.5.0')

      if ('data' in result) {
        // Windows should get RELEASES and .nupkg files
        expect(result.data.assets.some(a => a.name === 'RELEASES')).toBe(true)
        expect(result.data.assets.some(a => a.name.endsWith('.nupkg'))).toBe(true)
      }
    })

    it('filters assets correctly for Linux platform', async () => {
      vi.mocked(githubClient.getLatestRelease).mockResolvedValue(mockRelease)

      const result = await electronService.getLatestUpdate('linux-x64', '1.5.0')

      if ('data' in result) {
        // Linux should get AppImage files
        expect(result.data.assets.every(a => a.name.endsWith('.AppImage'))).toBe(true)
      }
    })
  })

  describe('getDownloadUrl', () => {
    it('returns download URL for darwin-arm64', async () => {
      vi.mocked(githubClient.getLatestRelease).mockResolvedValue(mockRelease)

      const result = await electronService.getDownloadUrl('darwin-arm64')

      expect(typeof result).toBe('string')
      expect(result).toContain('arm64')
      expect(result).toContain('.dmg')
    })

    it('returns download URL for win32-x64', async () => {
      vi.mocked(githubClient.getLatestRelease).mockResolvedValue(mockRelease)

      const result = await electronService.getDownloadUrl('win32-x64')

      expect(typeof result).toBe('string')
      expect(result).toContain('Setup')
      expect(result).toContain('.exe')
    })

    it('returns 404 when no release is found', async () => {
      vi.mocked(githubClient.getLatestRelease).mockResolvedValue(null)

      const result = await electronService.getDownloadUrl('darwin-arm64')

      expect(result).toEqual({ status: 404, error: 'No release found' })
    })

    it('returns 400 for unsupported platform', async () => {
      vi.mocked(githubClient.getLatestRelease).mockResolvedValue(mockRelease)

      const result = await electronService.getDownloadUrl('unsupported-platform')

      expect(result).toEqual({
        status: 400,
        error: 'Unsupported platform: unsupported-platform',
      })
    })

    it('fetches specific version when provided', async () => {
      vi.mocked(githubClient.getReleaseByTag).mockResolvedValue(mockRelease)

      await electronService.getDownloadUrl('darwin-arm64', '1.7.0')

      expect(githubClient.getReleaseByTag).toHaveBeenCalledWith('electron', '1.7.0')
    })
  })

  describe('hasUpdate', () => {
    it('returns true when newer version is available', async () => {
      vi.mocked(githubClient.getLatestRelease).mockResolvedValue(mockRelease)

      const result = await electronService.hasUpdate('1.7.0')

      expect(result).toBe(true)
    })

    it('returns false when current version is latest', async () => {
      vi.mocked(githubClient.getLatestRelease).mockResolvedValue(mockRelease)

      const result = await electronService.hasUpdate('1.8.2')

      expect(result).toBe(false)
    })

    it('returns false when current version is newer', async () => {
      vi.mocked(githubClient.getLatestRelease).mockResolvedValue(mockRelease)

      const result = await electronService.hasUpdate('2.0.0')

      expect(result).toBe(false)
    })

    it('returns false when no release is found', async () => {
      vi.mocked(githubClient.getLatestRelease).mockResolvedValue(null)

      const result = await electronService.hasUpdate('1.5.0')

      expect(result).toBe(false)
    })
  })
})

