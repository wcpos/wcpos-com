import { describe, expect, it, vi } from 'vitest'
import CatchAllPage from './page'

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_HTTP_ERROR_FALLBACK;404')
  }),
}))

describe('CatchAllPage', () => {
  it('triggers notFound() for unknown URLs', async () => {
    const { notFound } = await import('next/navigation')

    expect(() => CatchAllPage()).toThrow()
    expect(notFound).toHaveBeenCalledTimes(1)
  })
})
