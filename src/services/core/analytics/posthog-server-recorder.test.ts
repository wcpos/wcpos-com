import { beforeEach, describe, expect, it, vi } from 'vitest'

const captureMock = vi.fn()
const getClientMock = vi.fn()

vi.mock('@/services/core/external/posthog-node-client', () => ({
  getPostHogServerClient: (...args: unknown[]) => getClientMock(...args),
}))

import { createPostHogServerRecorder } from './posthog-server-recorder'

describe('createPostHogServerRecorder', () => {
  beforeEach(() => {
    captureMock.mockReset()
    getClientMock.mockReset()
  })

  it('captures with the provided distinctId, name and properties', () => {
    getClientMock.mockReturnValue({ capture: captureMock })

    createPostHogServerRecorder(process.env).capture({
      name: 'checkout_completed',
      properties: { order_id: 'o1' },
      distinctId: 'anon_1',
    })

    expect(captureMock).toHaveBeenCalledWith({
      distinctId: 'anon_1',
      event: 'checkout_completed',
      properties: { order_id: 'o1' },
    })
  })

  it('falls back to a server distinct id when none is given', () => {
    getClientMock.mockReturnValue({ capture: captureMock })

    createPostHogServerRecorder(process.env).capture({ name: 'server_event' })

    expect(captureMock).toHaveBeenCalledWith(
      expect.objectContaining({ distinctId: 'wcpos-server-event' })
    )
  })

  it('no-ops without throwing when no client is configured', () => {
    getClientMock.mockReturnValue(null)

    expect(() =>
      createPostHogServerRecorder(process.env).capture({ name: 'x' })
    ).not.toThrow()
    expect(captureMock).not.toHaveBeenCalled()
  })
})
