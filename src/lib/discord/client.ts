import 'server-only'

import type { DiscordConfig } from './config'
import type { DiscordMemberRoleState } from './sync'

const DISCORD_API_BASE = 'https://discord.com/api/v10'

export interface DiscordOAuthUser {
  id: string
  username: string
  avatar: string | null
}

interface DiscordTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

interface DiscordGuildMember {
  user?: { id: string }
  roles?: string[]
}

async function parseDiscordError(response: Response): Promise<string> {
  const text = await response.text()
  try {
    const parsed = JSON.parse(text) as { message?: string }
    return parsed.message ?? text
  } catch {
    return text
  }
}

export class DiscordApiClient {
  constructor(private readonly config: DiscordConfig) {}

  buildAuthorizeUrl({ redirectUri, state }: { redirectUri: string; state: string }): string {
    const url = new URL(`${DISCORD_API_BASE}/oauth2/authorize`)
    url.searchParams.set('client_id', this.config.clientId)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'identify')
    url.searchParams.set('state', state)
    return url.toString()
  }

  async exchangeCode({ code, redirectUri }: { code: string; redirectUri: string }): Promise<string> {
    const body = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    })

    const response = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })

    if (!response.ok) {
      throw new Error(`Discord OAuth token exchange failed: ${await parseDiscordError(response)}`)
    }

    const token = (await response.json()) as DiscordTokenResponse
    return token.access_token
  }

  async getCurrentUser(accessToken: string): Promise<DiscordOAuthUser> {
    const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      throw new Error(`Discord user lookup failed: ${await parseDiscordError(response)}`)
    }

    return (await response.json()) as DiscordOAuthUser
  }

  private async botFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bot ${this.config.botToken}`)
    headers.set('Content-Type', 'application/json')

    return fetch(`${DISCORD_API_BASE}${path}`, {
      ...init,
      headers,
    })
  }

  async getMemberRoleState(discordUserId: string): Promise<DiscordMemberRoleState> {
    const response = await this.botFetch(
      `/guilds/${this.config.guildId}/members/${discordUserId}`
    )

    if (response.status === 404) return 'not_in_guild'
    if (!response.ok) {
      throw new Error(`Discord member lookup failed: ${await parseDiscordError(response)}`)
    }

    const member = (await response.json()) as DiscordGuildMember
    return member.roles?.includes(this.config.proRoleId) ? 'has_role' : 'missing_role'
  }

  async addRole(discordUserId: string): Promise<void> {
    const response = await this.botFetch(
      `/guilds/${this.config.guildId}/members/${discordUserId}/roles/${this.config.proRoleId}`,
      { method: 'PUT' }
    )

    if (!response.ok) {
      throw new Error(`Discord role add failed: ${await parseDiscordError(response)}`)
    }
  }

  async removeRole(discordUserId: string): Promise<void> {
    const response = await this.botFetch(
      `/guilds/${this.config.guildId}/members/${discordUserId}/roles/${this.config.proRoleId}`,
      { method: 'DELETE' }
    )

    if (!response.ok) {
      throw new Error(`Discord role removal failed: ${await parseDiscordError(response)}`)
    }
  }

  async listRoleHolderIds(): Promise<string[]> {
    const roleHolderIds = new Set<string>()
    let after: string | undefined

    do {
      const url = new URL(`${DISCORD_API_BASE}/guilds/${this.config.guildId}/members`)
      url.searchParams.set('limit', '1000')
      if (after) url.searchParams.set('after', after)

      const response = await this.botFetch(url.pathname + url.search)
      if (!response.ok) {
        throw new Error(`Discord member list failed: ${await parseDiscordError(response)}`)
      }

      const members = (await response.json()) as DiscordGuildMember[]
      for (const member of members) {
        if (member.user?.id && member.roles?.includes(this.config.proRoleId)) {
          roleHolderIds.add(member.user.id)
        }
      }

      after = members.at(-1)?.user?.id
      if (members.length < 1000) break
    } while (after)

    return [...roleHolderIds]
  }
}
