import type { LogRecord, Sink } from '@logtape/logtape'
import { deliver } from './deliver'

interface DiscordSinkOptions {
  webhookUrl: string
  username?: string
  rateLimitMs?: number
  /** Category prefixes (dot-joined) that bypass the rate limit entirely. */
  alwaysSendPrefixes?: string[]
}

export function createDiscordSink(options: DiscordSinkOptions): Sink {
  const {
    webhookUrl,
    username = 'WCPOS Logger',
    rateLimitMs = 30_000,
    alwaysSendPrefixes = [],
  } = options

  const lastSent = new Map<string, number>()

  const safeStringify = (value: unknown) => {
    try {
      return typeof value === 'string' ? value : JSON.stringify(value)
    } catch {
      return '[unserializable]'
    }
  }

  const colors: Record<string, number> = {
    error: 15158332, // red
    fatal: 10038562, // dark red
  }

  return (record: LogRecord) => {
    if (record.level !== 'error' && record.level !== 'fatal') return

    const category = record.category.join('.')
    // Match on category boundaries: exact, or a dot-delimited descendant.
    // Avoids `wcpos.store.sale` accidentally bypassing for `wcpos.store.salefoo`.
    const bypass = alwaysSendPrefixes.some(
      (p) => category === p || category.startsWith(`${p}.`)
    )
    if (!bypass) {
      const now = Date.now()
      const last = lastSent.get(category) ?? 0
      if (now - last < rateLimitMs) return
      lastSent.set(category, now)
    }

    const message = record.message.map(safeStringify).join('')

    const embed = {
      title: `${record.level.toUpperCase()}: ${category}`,
      description: message.slice(0, 2000),
      color: colors[record.level] ?? colors.error,
      timestamp: new Date(record.timestamp).toISOString(),
      fields: Object.entries(record.properties)
        .slice(0, 5)
        .map(([name, value]) => ({
          name,
          value: safeStringify(value).slice(0, 1024),
          inline: true,
        })),
    }

    deliver(
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, embeds: [embed] }),
      }).catch(() => {
        // Discord unavailable — silently drop
      })
    )
  }
}
