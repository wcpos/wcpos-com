import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { electronService } from './electron-service'

describe('electronService', () => {
  it('returns a stable error code for update checks while the service is stubbed', async () => {
    await expect(
      electronService.getLatestUpdate('darwin-arm64', '1.5.0')
    ).resolves.toEqual({ status: 404, errorCode: 'electron_service_not_implemented' })
  })

  it('returns a stable error code for download URLs while the service is stubbed', async () => {
    await expect(
      electronService.getDownloadUrl('darwin-arm64', 'latest')
    ).resolves.toEqual({ status: 404, errorCode: 'electron_service_not_implemented' })
  })
})
