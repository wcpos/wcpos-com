import { NextRequest, NextResponse } from 'next/server'
import { trackAttributedServerEvent } from '@/services/core/analytics/posthog-service'

/**
 * WooCommerce API Manager compatibility shim.
 *
 * The deployed WCPOS Pro plugin fleet activates and deactivates licences by
 * calling the retired WC API Manager endpoint:
 *
 *   GET https://wcpos.com/?wc-api=am-software-api&request=activation&api_key=…&instance=…
 *
 * On the old WPEngine WordPress site that created a WC AM activation record.
 * After the Keygen cutover that URL just returns the marketing homepage, so
 * activations silently do nothing — licences never register a machine and the
 * plugin's status banner (which reads the new Keygen-backed server) is stuck on
 * "inactive". Middleware rewrites those legacy requests here.
 *
 * This bridge forwards to the Keygen-backed licence server at updates.wcpos.com,
 * which owns both the legacy per-order key alias map and the machine logic, and
 * translates the result back into the `{ success, activated }` envelope the
 * plugin expects. Once the plugin (1.9.7+) activates against the new endpoint
 * directly, this shim can be retired.
 */

const UPDATES_BASE = 'https://updates.wcpos.com'
const UPDATES_TIMEOUT_MS = 5000

const CORS_HEADERS: Record<string, string> = {
  // The plugin calls this cross-origin from the merchant's wp-admin, with
  // credentials omitted, so a wildcard origin is both sufficient and safe.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
}

interface LicenseResult {
  status: number
  data?: { valid?: boolean; activated?: boolean; status?: string }
  error?: string
  message?: string
}

interface WcAmResponse {
  success: boolean
  activated?: boolean
  error?: string
  code?: number
}

function reply(body: WcAmResponse): NextResponse {
  // WC AM always answered 200 and carried the outcome in the body; the plugin
  // branches on `success`, not the HTTP status. Keep that contract.
  return NextResponse.json(body, { status: 200, headers: CORS_HEADERS })
}

function errorText(result: LicenseResult): string {
  return result.message || result.error || 'License request failed'
}

async function proxy(
  path: string,
  init: RequestInit,
): Promise<LicenseResult> {
  const res = await fetch(`${UPDATES_BASE}${path}`, {
    ...init,
    signal: AbortSignal.timeout(UPDATES_TIMEOUT_MS),
  })
  const body = (await res.json().catch(() => ({}))) as LicenseResult
  return { ...body, status: body.status ?? res.status }
}

function activationBody(key: string, instance: string): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, instance }),
  }
}

/**
 * Join a successful activation back to its landing-page exposure. The plugin
 * forwards the marketing-site anon_id (and a stable site_uuid) as query args
 * for attribution (wcpos-com#143); without capturing here that link is lost,
 * since the plugin polls this shim instead of loading a page posthog-js runs on.
 *
 * Fire-and-forget by contract: this must never delay or fail the activation
 * response. `trackAttributedServerEvent` captures synchronously, swallows its
 * own errors, and self-registers delivery with the request's waitUntil — the
 * try/catch only guards the unlikely throw from building the PostHog client.
 * No anon_id ⇒ no attribution to record (and no consent to infer), so skip.
 */
function recordActivationAttribution(params: URLSearchParams): void {
  const anonId = params.get('anon_id')
  if (!anonId) return

  try {
    trackAttributedServerEvent('license_activated', anonId, {
      site_uuid: params.get('site_uuid') ?? undefined,
      instance: params.get('instance') ?? undefined,
      source: 'wc-am-shim',
    })
  } catch {
    // Attribution is best-effort; never let it disturb the activation reply.
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams
  // WC AM sends the licence as `api_key`; accept `key` too for resilience.
  const key = params.get('api_key') ?? params.get('key')
  const instance = params.get('instance')
  const action = params.get('request') ?? 'status'

  if (!key || !instance) {
    return reply({ success: false, error: 'Missing required parameters: api_key and instance' })
  }

  try {
    if (action === 'deactivation') {
      const result = await proxy('/pro/license/deactivate', activationBody(key, instance))
      const notFoundText = `${result.error ?? ''} ${result.message ?? ''}`.toLowerCase()
      const machineAlreadyGone =
        result.status === 404 &&
        (notFoundText.includes('machine') || notFoundText.includes('instance')) &&
        (notFoundText.includes('not found') || notFoundText.includes('not activated'))
      if (result.status === 200 || machineAlreadyGone) {
        return reply({ success: true, activated: false })
      }
      return reply({ success: false, activated: false, error: errorText(result), code: result.status })
    }

    const path = action === 'activation' ? '/pro/license/activate' : '/pro/license/status'
    const init =
      action === 'activation'
        ? activationBody(key, instance)
        : { method: 'GET' as const }
    const forwardPath =
      action === 'activation'
        ? path
        : `${path}?key=${encodeURIComponent(key)}&instance=${encodeURIComponent(instance)}`

    const result = await proxy(forwardPath, init)

    if (result.status === 200 && result.data?.valid) {
      // Only genuine activations carry landing-page attribution; status polls
      // (the plugin's frequent re-checks) must not inflate the event stream.
      if (action === 'activation' && result.data.activated) {
        recordActivationAttribution(params)
      }
      return reply({ success: true, activated: !!result.data.activated })
    }
    return reply({ success: false, activated: false, error: errorText(result), code: result.status })
  } catch {
    return reply({
      success: false,
      error: 'The license server is temporarily unavailable. Please try again shortly.',
    })
  }
}
