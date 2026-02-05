import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/utils/env'

/**
 * POST /api/logs
 *
 * Accepts logs from the browser and forwards them to Loki
 * This avoids exposing Loki directly to the internet
 */
export async function POST(request: NextRequest) {
  try {
    const logs = await request.json()

    // Validate log structure
    if (!Array.isArray(logs) || logs.length === 0) {
      return NextResponse.json(
        { error: 'Invalid log format' },
        { status: 400 }
      )
    }

    // Forward to Loki if configured
    const lokiUrl = env.LOKI_URL
    if (!lokiUrl) {
      // Silently succeed if Loki is not configured (logs still go to console)
      return NextResponse.json({ success: true })
    }

    const endpoint = lokiUrl.replace(/\/$/, '') + '/loki/api/v1/push'

    // Prepare Loki payload
    const payload = {
      streams: [
        {
          stream: {
            job: 'wcpos-com',
            service: 'wcpos-com',
            environment: process.env.NODE_ENV ?? 'production',
            source: 'browser',
          },
          values: logs,
        },
      ],
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (env.LOKI_API_KEY) {
      headers['X-API-Key'] = env.LOKI_API_KEY
    }

    // Forward to Loki
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error('Failed to forward logs to Loki:', response.status)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in logs API:', error)
    // Return success anyway to avoid breaking the client
    return NextResponse.json({ success: true })
  }
}
