import { NextResponse } from 'next/server'
import { stopImpersonation } from '@/lib/impersonation'
import { getSessionCustomer } from '@/lib/medusa-auth'
import { authLogger } from '@/lib/logger'
import { defaultLocale, locales } from '@/i18n/config'
import { getPathname } from '@/i18n/navigation'

function accountUrl(request: Request): URL {
  const requestUrl = new URL(request.url)
  const explicitLocale = requestUrl.searchParams.get('locale')
  const referer = request.headers.get('referer')
  let refererPathname = ''
  try {
    refererPathname = referer ? new URL(referer).pathname : ''
  } catch {
    refererPathname = ''
  }
  const refererLocale = refererPathname.split('/')[1]
  const locale = locales.find(
    (candidate) => candidate === explicitLocale || candidate === refererLocale
  )
  return new URL(getPathname({ href: '/account', locale: locale ?? defaultLocale }), request.url)
}

async function exit(request: Request) {
  const session = await getSessionCustomer()
  await stopImpersonation()
  authLogger.info`Impersonation STOP: admin_id=${session?.id ?? 'unknown'}`
  return NextResponse.redirect(accountUrl(request), { status: 303 })
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
