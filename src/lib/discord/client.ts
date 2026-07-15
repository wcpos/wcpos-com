import 'server-only'

import type { DiscordConfig } from './config'
import type { DiscordMemberRoleState } from './sync'

const DISCORD_API_BASE = 'https://discord.com/api/v10'
const MAX_RATE_LIMIT_RETRIES = 1
const MAX_RATE_LIMIT_WAIT_MS = 5_000
const DISCORD_REQUEST_TIMEOUT_MS = 10_000
const ORPHAN_REMOVAL_AUDIT_REASON = encodeURIComponent(
  'WCPOS reconciliation: no active connected licence'
)

export class DiscordRateLimitError extends Error {
  readonly retryAfterMs: number | null

  constructor(message: string, retryAfter: number | null) {
    super(message)
    this.name = 'DiscordRateLimitError'
    this.retryAfterMs = retryAfter
  }
}

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

export interface DiscordChannelMessage {
  id: string
  embeds?: Array<{
    title?: string
    description?: string
    color?: number
    fields?: Array<{ name?: string; value?: string; inline?: boolean }>
    footer?: { text?: string }
  }>
}

export interface DiscordMessagePayload {
  content?: string
  embeds?: unknown[]
  /** `{ parse: [] }` disables all pings — card text embeds customer data. */
  allowed_mentions?: { parse: string[] }
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

async function retryAfterMs(response: Response): Promise<number | null> {
  const header = response.headers.get('Retry-After')
  if (header !== null) {
    const seconds = Number(header)
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000
  }

  try {
    const body = (await response.clone().json()) as { retry_after?: unknown }
    const seconds = Number(body.retry_after)
    return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1_000 : null
  } catch {
    return null
  }
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function discordBotError(response: Response, operation: string): Promise<Error> {
  if (response.status === 429) {
    return new DiscordRateLimitError(
      `${operation} rate limited: ${await parseDiscordError(response.clone())}`,
      await retryAfterMs(response)
    )
  }
  return new Error(`${operation} failed: ${await parseDiscordError(response)}`)
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

    for (let attempt = 0; ; attempt += 1) {
      const response = await fetch(`${DISCORD_API_BASE}${path}`, {
        ...init,
        headers,
        signal: init.signal
          ? AbortSignal.any([init.signal, AbortSignal.timeout(DISCORD_REQUEST_TIMEOUT_MS)])
          : AbortSignal.timeout(DISCORD_REQUEST_TIMEOUT_MS),
      })
      if (response.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) {
        return response
      }

      const delay = await retryAfterMs(response)
      if (delay === null || delay > MAX_RATE_LIMIT_WAIT_MS) return response
      await wait(delay)
    }
  }

  async getMemberRoleState(discordUserId: string): Promise<DiscordMemberRoleState> {
    const response = await this.botFetch(
      `/guilds/${this.config.guildId}/members/${discordUserId}`
    )

    if (response.status === 404) return 'not_in_guild'
    if (!response.ok) {
      throw await discordBotError(response, 'Discord member lookup')
    }

    const member = (await response.json()) as DiscordGuildMember
    return member.roles?.includes(this.config.proRoleId) ? 'has_role' : 'missing_role'
  }

  async addRole(discordUserId: string): Promise<void> {
    const response = await this.botFetch(
      `/guilds/${this.config.guildId}/members/${discordUserId}/roles/${this.config.proRoleId}`,
      { method: 'PUT' }
    )

    if (response.status === 404) return
    if (!response.ok) {
      throw await discordBotError(response, 'Discord role add')
    }
  }

  async removeRole(discordUserId: string): Promise<void> {
    const response = await this.botFetch(
      `/guilds/${this.config.guildId}/members/${discordUserId}/roles/${this.config.proRoleId}`,
      {
        method: 'DELETE',
        headers: { 'X-Audit-Log-Reason': ORPHAN_REMOVAL_AUDIT_REASON },
      }
    )

    if (response.status === 404) return
    if (!response.ok) {
      throw await discordBotError(response, 'Discord role removal')
    }
  }

  /**
   * All messages in a channel, oldest-first pagination irrelevant to callers —
   * the directory sync only needs the full set. Locked to bot-authored
   * channels in practice (#member-directory), so volume is one message per
   * linked member.
   */
  async listChannelMessages(channelId: string): Promise<DiscordChannelMessage[]> {
    const messages: DiscordChannelMessage[] = []
    let before: string | undefined

    do {
      const search = new URLSearchParams({ limit: '100' })
      if (before) search.set('before', before)

      const response = await this.botFetch(`/channels/${channelId}/messages?${search}`)
      if (!response.ok) {
        throw new Error(`Discord channel message list failed: ${await parseDiscordError(response)}`)
      }

      const page = (await response.json()) as DiscordChannelMessage[]
      messages.push(...page)
      before = page.at(-1)?.id
      if (page.length < 100) break
    } while (before)

    return messages
  }

  async getChannelMessage(
    channelId: string,
    messageId: string
  ): Promise<DiscordChannelMessage | null> {
    const response = await this.botFetch(`/channels/${channelId}/messages/${messageId}`)
    if (response.status === 404) return null
    if (!response.ok) {
      throw new Error(`Discord channel message lookup failed: ${await parseDiscordError(response)}`)
    }
    return (await response.json()) as DiscordChannelMessage
  }

  async createChannelMessage(channelId: string, payload: DiscordMessagePayload): Promise<void> {
    const response = await this.botFetch(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      throw new Error(`Discord channel message create failed: ${await parseDiscordError(response)}`)
    }
  }

  async editChannelMessage(
    channelId: string,
    messageId: string,
    payload: DiscordMessagePayload
  ): Promise<void> {
    const response = await this.botFetch(`/channels/${channelId}/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    // A hand-deleted card between list and edit is not an error — the next
    // sync recreates it.
    if (response.status === 404) return
    if (!response.ok) {
      throw new Error(`Discord channel message edit failed: ${await parseDiscordError(response)}`)
    }
  }

  async deleteChannelMessage(channelId: string, messageId: string): Promise<void> {
    const response = await this.botFetch(`/channels/${channelId}/messages/${messageId}`, {
      method: 'DELETE',
    })
    if (response.status === 404) return
    if (!response.ok) {
      throw new Error(`Discord channel message delete failed: ${await parseDiscordError(response)}`)
    }
  }

  async listRoleHolderIds(): Promise<string[]> {
    const roleHolderIds = new Set<string>()
    let after: string | undefined

    do {
      const search = new URLSearchParams({ limit: '1000' })
      if (after) search.set('after', after)

      const response = await this.botFetch(
        `/guilds/${this.config.guildId}/members?${search}`
      )
      if (!response.ok) {
        throw await discordBotError(response, 'Discord member list')
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
