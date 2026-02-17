import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

describe('GET /api/pro/download/[version]', () => {
  it('returns 400 when key/instance are missing', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/pro/download/latest'),
      { params: Promise.resolve({ version: 'latest' }) }
    )

    expect(response.status).toBe(400)
  })
})
