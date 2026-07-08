/**
 * Registers the WCPOS Discord guild commands: /link, /unlink and the
 * admin-only "Customer info" user context command (ADR-0007 amendment,
 * ADR-0014). Guild-scoped registration so updates apply instantly.
 *
 * Usage:
 *   DISCORD_BOT_TOKEN=... DISCORD_GUILD_ID=... pnpm discord:register-commands
 *
 * Idempotent: PUT replaces the guild's full command set for this app, so
 * rerunning after a change is the whole deployment story. Run it once per
 * environment change — commands live in Discord, not in this repo's deploys.
 */

const DISCORD_API_BASE = 'https://discord.com/api/v10'

const CHAT_INPUT = 1
const USER = 2
const STRING_OPTION = 3
// Permission bit for Manage Server — the default gate for "Customer info".
// Guild admins can re-scope it in Server Settings → Integrations; the
// interactions endpoint re-checks invoker permissions server-side either way.
const MANAGE_GUILD = '32'

const COMMANDS = [
  {
    name: 'link',
    type: CHAT_INPUT,
    description: 'Connect this Discord account to a WCPOS Pro license for the Pro role',
    options: [
      {
        type: STRING_OPTION,
        name: 'key',
        description: 'Your WCPOS Pro license key (Account → Licenses on wcpos.com)',
        required: true,
      },
    ],
  },
  {
    name: 'unlink',
    type: CHAT_INPUT,
    description: 'Disconnect this Discord account from a WCPOS Pro license',
    options: [
      {
        type: STRING_OPTION,
        name: 'key',
        description: 'The WCPOS Pro license key this account is connected to',
        required: true,
      },
    ],
  },
  {
    name: 'Customer info',
    type: USER,
    default_member_permissions: MANAGE_GUILD,
  },
]

const botToken = process.env.DISCORD_BOT_TOKEN
const guildId = process.env.DISCORD_GUILD_ID

if (!botToken || !guildId) {
  console.error('DISCORD_BOT_TOKEN and DISCORD_GUILD_ID are required.')
  process.exit(1)
}

const headers = {
  Authorization: `Bot ${botToken}`,
  'Content-Type': 'application/json',
}

const appResponse = await fetch(`${DISCORD_API_BASE}/applications/@me`, { headers })
if (!appResponse.ok) {
  console.error(`Failed to resolve application (${appResponse.status}): ${await appResponse.text()}`)
  process.exit(1)
}
const application = await appResponse.json()

const registerResponse = await fetch(
  `${DISCORD_API_BASE}/applications/${application.id}/guilds/${guildId}/commands`,
  { method: 'PUT', headers, body: JSON.stringify(COMMANDS) }
)
if (!registerResponse.ok) {
  console.error(`Command registration failed (${registerResponse.status}): ${await registerResponse.text()}`)
  process.exit(1)
}

const registered = await registerResponse.json()
console.log(`Registered ${registered.length} commands for app "${application.name}" in guild ${guildId}:`)
for (const command of registered) {
  console.log(`  - ${command.name} (type ${command.type})`)
}
