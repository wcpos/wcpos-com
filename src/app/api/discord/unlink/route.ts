import { NextRequest, NextResponse } from 'next/server'
import { getCustomer, updateCustomer } from '@/lib/medusa-auth'
import { clearDiscordLinkMetadata } from '@/lib/discord/metadata'
import { removeCurrentCustomerDiscordRole } from '@/lib/discord/current-customer-sync'
import { infraLogger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const customer = await getCustomer()
  if (!customer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await removeCurrentCustomerDiscordRole(customer)
  } catch (error) {
    infraLogger.warn`Discord role removal during unlink failed: ${error}`
  }

  const updatedCustomer = await updateCustomer({
    metadata: clearDiscordLinkMetadata(customer.metadata),
  })
  if (!updatedCustomer) {
    infraLogger.error`Discord unlink failed: customer metadata update returned empty result`
    const errorUrl = new URL('/account/profile', request.url)
    errorUrl.searchParams.set('discord', 'error')
    return NextResponse.redirect(errorUrl, { status: 303 })
  }

  const url = new URL('/account/profile', request.url)
  url.searchParams.set('discord', 'unlinked')
  return NextResponse.redirect(url, { status: 303 })
}
