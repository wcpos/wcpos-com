import { NextResponse } from 'next/server'
import { stopImpersonation } from '@/lib/impersonation'
import { getSessionCustomer } from '@/lib/medusa-auth'
import { authLogger } from '@/lib/logger'

async function exit(request: Request) {
  const session = await getSessionCustomer()
  await stopImpersonation()
  authLogger.info`Impersonation STOP: admin=${session?.email ?? 'unknown'}`
  return NextResponse.redirect(new URL('/account', request.url), { status: 303 })
}

export async function POST(request: Request) {
  return exit(request)
}

// GET variant so a server-component render (which cannot delete cookies) can
// bounce a stale/deleted impersonation target here to clear the cookie and
// land the owner back on their own account. See AccountGate in
// src/app/[locale]/account/layout.tsx.
export async function GET(request: Request) {
  return exit(request)
}
