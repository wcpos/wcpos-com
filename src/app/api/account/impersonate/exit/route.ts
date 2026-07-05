import { NextResponse } from 'next/server'
import { stopImpersonation } from '@/lib/impersonation'
import { getSessionCustomer } from '@/lib/medusa-auth'
import { authLogger } from '@/lib/logger'

export async function POST(request: Request) {
  const session = await getSessionCustomer()
  await stopImpersonation()
  authLogger.info`Impersonation STOP: admin=${session?.email ?? 'unknown'}`
  return NextResponse.redirect(new URL('/account', request.url), { status: 303 })
}
