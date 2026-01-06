import type { GitHubReleaseInfo, GitHubAsset } from '@/types/github'

/**
 * Helper to create a mock GitHub asset with all required fields
 */
function createMockAsset(
  id: number,
  name: string,
  size: number,
  content_type: string = 'application/octet-stream'
): GitHubAsset {
  return {
    id,
    name,
    content_type,
    size,
    browser_download_url: `https://github.com/wcpos/electron/releases/download/v1.8.2/${name}`,
    url: `https://api.github.com/repos/wcpos/electron/releases/assets/${id}`,
    node_id: `RA_${id}`,
    label: null,
    state: 'uploaded',
    download_count: 100,
    created_at: '2026-01-05T18:40:35Z',
    updated_at: '2026-01-05T18:40:35Z',
    uploader: null,
    digest: null,
  }
}

/**
 * Mock GitHub release data for testing
 */
export const mockRelease: GitHubReleaseInfo = {
  tagName: 'v1.8.2',
  name: 'v1.8.2',
  body: 'Release notes for version 1.8.2\n\n- Bug fixes\n- Performance improvements',
  publishedAt: '2026-01-05T18:40:35Z',
  assets: [
    createMockAsset(1, 'WooCommerce-POS-darwin-arm64-1.8.2.zip', 116087844, 'application/zip'),
    createMockAsset(2, 'WooCommerce-POS-darwin-x64-1.8.2.zip', 120000000, 'application/zip'),
    createMockAsset(3, 'WooCommerce-POS-Setup-1.8.2.exe', 130000000),
    createMockAsset(4, 'RELEASES', 85),
    createMockAsset(5, 'WooCommercePOS-1.8.2-full.nupkg', 137091237),
    createMockAsset(6, 'WooCommerce-POS-1.8.2.AppImage', 140000000),
    createMockAsset(7, 'WooCommerce-POS-arm64-1.8.2.dmg', 118000000),
  ],
}

