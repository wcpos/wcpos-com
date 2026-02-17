import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

describe('GET /api/pro/update/[version]', () => {
  it('returns 400 when key/instance are missing', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/pro/update/1.0.0'),
      { params: Promise.resolve({ version: '1.0.0' }) }
    )

    expect(response.status).toBe(400)
  })
})
