import { NextResponse } from 'next/server'

/**
 * Health Check API
 *
 * GET /api/health
 *
 * Simple health check endpoint for monitoring services.
 */
export async function GET() {
  const response = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
  }

  return NextResponse.json(response, { status: 200 })
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}

