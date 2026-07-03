/**
 * Render a LogTape message part (or property value) as a string.
 *
 * Error objects JSON.stringify to `{}` (their properties are non-enumerable),
 * which is how alerts ended up reading "Failed to initiate OAuth: {}". Every
 * sink renders interpolated values through this helper instead so an Error
 * carries its stack (whose first line is "Name: message") and cause chain.
 */
export function stringifyLogPart(value: unknown): string {
  if (typeof value === 'string') return value

  if (value instanceof Error) {
    const parts: string[] = [value.stack ?? `${value.name}: ${value.message}`]
    let cause = value.cause
    // Bounded so a cyclic cause chain cannot loop forever.
    for (let depth = 0; cause !== undefined && depth < 4; depth++) {
      if (cause instanceof Error) {
        parts.push(
          `Caused by: ${cause.stack ?? `${cause.name}: ${cause.message}`}`
        )
        cause = cause.cause
      } else {
        parts.push(`Caused by: ${safeJson(cause)}`)
        break
      }
    }
    return parts.join('\n')
  }

  return safeJson(value)
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return '[unserializable]'
  }
}
