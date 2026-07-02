import type { LogRecord, Sink } from '@logtape/logtape'
import { deliver } from './deliver'
import { stringifyLogPart } from './stringify-log-part'

/**
 * Email sink for the immediate-attention tier. Fires on `fatal` ONLY (the
 * paid-but-no-license / broken-checkout / download-infra-down severity) so the
 * inbox stays the loud "wake me up" channel while Discord carries everything.
 *
 * Fire-and-forget POST to the Resend REST API — no SDK dependency, mirroring
 * the Discord sink. A per-category throttle stops an incident (many fatals in a
 * burst) from flooding the inbox; Discord still receives every event.
 */

interface EmailSinkOptions {
  apiKey: string
  /** One or more recipients (comma-separated string is split). */
  to: string
  from: string
  /** Per-category min interval between emails. Default 60s. */
  rateLimitMs?: number
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function createEmailSink(options: EmailSinkOptions): Sink {
  const { apiKey, from, rateLimitMs = 60_000 } = options
  const to = options.to
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean)

  const lastSent = new Map<string, number>()

  return (record: LogRecord) => {
    if (record.level !== 'fatal') return
    if (to.length === 0) return

    const category = record.category.join('.')

    // Throttle per category so a burst of the same fatal can't flood the inbox.
    const now = Date.now()
    const last = lastSent.get(category) ?? 0
    if (now - last < rateLimitMs) return
    lastSent.set(category, now)

    const message = record.message.map(stringifyLogPart).join('')
    const fieldLines = Object.entries(record.properties)
      .slice(0, 10)
      .map(([name, value]) => `${name}: ${stringifyLogPart(value).slice(0, 500)}`)
      .join('\n')

    const subject = `[FATAL] wcpos-com: ${category}`.slice(0, 200)
    const html = `<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; color: #111;">
        <h2 style="margin: 0 0 8px; color: #b91c1c;">${escapeHtml(category)}</h2>
        <p style="white-space: pre-wrap; font-size: 15px;">${escapeHtml(message.slice(0, 2000))}</p>
        ${
          fieldLines
            ? `<pre style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; font-size: 13px; white-space: pre-wrap; word-break: break-word; color: #374151;">${escapeHtml(fieldLines)}</pre>`
            : ''
        }
        <p style="color: #9ca3af; font-size: 12px;">${new Date(record.timestamp).toISOString()} · wcpos-com</p>
      </div>`

    deliver(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ from, to, subject, html }),
        // Bound the waitUntil-extended function lifetime if Resend hangs.
        signal: AbortSignal.timeout(3000),
      }).catch(() => {
        // Resend unavailable — silently drop. Discord is the redundant channel.
      })
    )
  }
}
