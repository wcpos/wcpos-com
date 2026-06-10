import { NextRequest, NextResponse } from 'next/server'
import { getCustomer } from '@/lib/medusa-auth'
import { syncCurrentCustomerDiscordRole } from '@/lib/discord/current-customer-sync'
import { infraLogger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const customer = await getCustomer()
  if (!customer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await syncCurrentCustomerDiscordRole(customer)
    const url = new URL('/account', request.url)
    url.searchParams.set('discord', 'synced')
    return NextResponse.redirect(url, { status: 303 })
  } catch (error) {
    infraLogger.error`Discord role resync failed: ${error}`
    const url = new URL('/account', request.url)
    url.searchParams.set('discord', 'error')
    return NextResponse.redirect(url, { status: 303 })
  }
}
