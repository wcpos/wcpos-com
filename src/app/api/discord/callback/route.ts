import { NextRequest, NextResponse } from 'next/server'
import { getCustomer, updateCustomer } from '@/lib/medusa-auth'
import { DiscordApiClient } from '@/lib/discord/client'
import { getDiscordConfig } from '@/lib/discord/config'
import { consumeDiscordOAuthState } from '@/lib/discord/oauth-state'
import { buildDiscordLinkMetadata } from '@/lib/discord/metadata'
import { syncCurrentCustomerDiscordRole } from '@/lib/discord/current-customer-sync'
import { findCustomerByDiscordUserId } from '@/lib/discord/medusa-admin'
import { infraLogger } from '@/lib/logger'

function callbackRedirect(request: NextRequest, path: string, status: string): NextResponse {
  const url = new URL(path, request.url)
  url.searchParams.set('discord', status)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const storedState = await consumeDiscordOAuthState()
  const customer = await getCustomer()

  if (!code || !state || !storedState || storedState.state !== state || !customer || storedState.customerId !== customer.id) {
    return callbackRedirect(request, storedState?.returnTo ?? '/account', 'error')
  }

  try {
    const client = new DiscordApiClient(getDiscordConfig())
    const redirectUri = new URL('/api/discord/callback', request.url).toString()
    const accessToken = await client.exchangeCode({ code, redirectUri })
    const discordUser = await client.getCurrentUser(accessToken)
    const existingLink = await findCustomerByDiscordUserId(discordUser.id)

    if (existingLink && existingLink.id !== customer.id) {
      return callbackRedirect(request, storedState.returnTo, 'already_linked')
    }

    const updatedCustomer = await updateCustomer({
      metadata: buildDiscordLinkMetadata(customer.metadata, {
        id: discordUser.id,
        username: discordUser.username,
        avatar: discordUser.avatar,
        linkedAt: new Date(),
      }),
    })

    if (updatedCustomer) {
      try {
        await syncCurrentCustomerDiscordRole(updatedCustomer)
      } catch (syncError) {
        infraLogger.warn`Discord role sync after link failed: ${syncError}`
      }
    }

    return callbackRedirect(request, storedState.returnTo, 'linked')
  } catch (error) {
    infraLogger.error`Discord link callback failed: ${error}`
    return callbackRedirect(request, storedState.returnTo, 'error')
  }
}
