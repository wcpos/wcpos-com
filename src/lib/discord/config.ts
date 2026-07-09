import { env } from '@/utils/env'

export interface DiscordConfig {
  clientId: string
  clientSecret: string
  botToken: string
  guildId: string
  proRoleId: string
  adminApiToken: string
  publicKey?: string
  /** The locked #member-directory channel (owner + bot only). Optional so the
   *  directory feature ships dark until the channel exists (#522). */
  directoryChannelId?: string
}

export function getDiscordConfig(): DiscordConfig {
  const missing = [
    ['DISCORD_CLIENT_ID', env.DISCORD_CLIENT_ID],
    ['DISCORD_CLIENT_SECRET', env.DISCORD_CLIENT_SECRET],
    ['DISCORD_BOT_TOKEN', env.DISCORD_BOT_TOKEN],
    ['DISCORD_GUILD_ID', env.DISCORD_GUILD_ID],
    ['DISCORD_PRO_ROLE_ID', env.DISCORD_PRO_ROLE_ID],
    ['MEDUSA_ADMIN_API_TOKEN', env.MEDUSA_ADMIN_API_TOKEN],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name)

  if (missing.length > 0) {
    throw new Error(`Discord role sync is not configured: ${missing.join(', ')}`)
  }

  return {
    clientId: env.DISCORD_CLIENT_ID!,
    clientSecret: env.DISCORD_CLIENT_SECRET!,
    botToken: env.DISCORD_BOT_TOKEN!,
    guildId: env.DISCORD_GUILD_ID!,
    proRoleId: env.DISCORD_PRO_ROLE_ID!,
    adminApiToken: env.MEDUSA_ADMIN_API_TOKEN!,
    publicKey: env.DISCORD_PUBLIC_KEY,
    directoryChannelId: env.DISCORD_DIRECTORY_CHANNEL_ID,
  }
}

/** The directory rides the base Discord config plus its channel id. */
export function isDiscordDirectoryConfigured(): boolean {
  return isDiscordConfigured() && Boolean(env.DISCORD_DIRECTORY_CHANNEL_ID)
}

export function isDiscordConfigured(): boolean {
  return Boolean(
    env.DISCORD_CLIENT_ID &&
      env.DISCORD_CLIENT_SECRET &&
      env.DISCORD_BOT_TOKEN &&
      env.DISCORD_GUILD_ID &&
      env.DISCORD_PRO_ROLE_ID &&
      env.MEDUSA_ADMIN_API_TOKEN
  )
}
