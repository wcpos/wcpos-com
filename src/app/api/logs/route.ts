import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/utils/env'
import { infraLogger } from '@/lib/logger'
import { buildLokiPayload, lokiPushEndpoint } from '@/lib/sinks/loki-format'

/**
 * POST /api/logs
 *
 * Accepts logs from the browser and forwards them to Loki
 * This avoids exposing Loki directly to the internet
 *
 * Failures here are logged ONCE per request via the server-side logger sinks
 * (never per forwarded entry, and never back through this route), so a Loki
 * outage cannot create a log feedback loop.
 */
export async function POST(request: NextRequest) {
  // Malformed JSON is client-caused: treat it like the other validation
  // failures below (400, no error-level log) rather than an infra error.
  const logs = await request.json().catch(() => null)

  try {
    // Validate log structure
    if (!Array.isArray(logs) || logs.length === 0) {
      return NextResponse.json(
        { errorCode: 'invalid_log_format' },
        { status: 400 }
      )
    }

    // Validate each log entry is a proper [timestamp, message] tuple
    for (const entry of logs) {
      if (
        !Array.isArray(entry) ||
        entry.length !== 2 ||
        typeof entry[1] !== 'string' ||
        isNaN(Number(entry[0]))
      ) {
        return NextResponse.json(
          { errorCode: 'invalid_log_entry_format' },
          { status: 400 }
        )
      }
    }

    // Forward to Loki if configured
    const lokiUrl = env.LOKI_URL
    if (!lokiUrl) {
      // Silently succeed if Loki is not configured (logs still go to console)
      return NextResponse.json({ success: true })
    }

    const endpoint = lokiPushEndpoint(lokiUrl)

    // Prepare Loki payload
    const payload = buildLokiPayload(
      {
        job: 'wcpos-com',
        service: 'wcpos-com',
        environment: process.env.NODE_ENV ?? 'production',
        source: 'browser',
      },
      logs
    )

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
      infraLogger.error`Failed to forward browser logs to Loki: status=${response.status}`
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    infraLogger.error`Browser log forwarding failed: ${error}`
    // Return success anyway to avoid breaking the client
    return NextResponse.json({ success: true })
  }
}
