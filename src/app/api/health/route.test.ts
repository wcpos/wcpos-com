import { describe, expect, it } from 'vitest'
import { GET, HEAD } from './route'

describe('GET /api/health', () => {
  it('returns 200 with the health payload', async () => {
    const response = await GET()
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.status).toBe('healthy')
    expect(typeof json.version).toBe('string')
    expect(json.version.length).toBeGreaterThan(0)
    expect(json.environment).toBe('test')
  })

  it('returns a valid ISO timestamp', async () => {
    const before = Date.now()
    const response = await GET()
    const after = Date.now()
    const json = await response.json()

    const timestamp = new Date(json.timestamp).getTime()
    expect(json.timestamp).toBe(new Date(json.timestamp).toISOString())
    expect(timestamp).toBeGreaterThanOrEqual(before - 1000)
    expect(timestamp).toBeLessThanOrEqual(after + 1000)
  })
})

describe('HEAD /api/health', () => {
  it('returns 200 with no body', async () => {
    const response = await HEAD()

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('')
  })
})
