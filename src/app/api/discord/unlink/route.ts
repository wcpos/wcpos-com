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

  await updateCustomer({ metadata: clearDiscordLinkMetadata(customer.metadata) })

  const url = new URL('/account', request.url)
  url.searchParams.set('discord', 'unlinked')
  return NextResponse.redirect(url, { status: 303 })
}
