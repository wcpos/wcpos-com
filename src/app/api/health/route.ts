import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { resolveStoreEnvironmentName } from '@/lib/store-environment'
import { resolveTurnstileSiteKey } from '@/lib/support/turnstile-keys'
import { env } from '@/utils/env'

/**
 * Health Check API
 *
 * GET /api/health
 *
 * Simple health check endpoint for monitoring services.
 */
export async function GET() {
  const host = (await headers()).get('host')

  const response = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    // Vercel/Node build environment — always "production" on the live build,
    // for EVERY domain (beta included). This is a deployment fact, not the
    // money environment; see storeEnvironment for what a host actually uses.
    environment: process.env.NODE_ENV,
    // Host-resolved store environment: which backend + payment mode this
    // request's host maps to. wcpos.com → "live" (real money); beta.wcpos.com
    // and *.vercel.app → "test" (staging + test-mode Stripe); anything else →
    // "dev".
    storeEnvironment: resolveStoreEnvironmentName(host),
    // Support-box config diagnostics. turnstileSiteKey is the EFFECTIVE
    // host-resolved key the widget on this host actually renders (public by
    // design — Cloudflare puts it in client HTML); secrets are reported as
    // presence only. Exists because an empty baked site key silently took
    // the support box down (2026-07-08).
    support: {
      turnstileSiteKey: resolveTurnstileSiteKey(host),
      turnstileSecretKey: Boolean(env.TURNSTILE_SECRET_KEY),
      openclawToken: Boolean(env.OPENCLAW_TOKEN),
    },
  }

  return NextResponse.json(response, { status: 200 })
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}

