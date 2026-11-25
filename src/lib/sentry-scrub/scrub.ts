// Ported verbatim from wcpos/monorepo packages/utils/src/logger/sentry-core.ts at v2.0.3: the same email/phone/credential scrubbing the POS apps apply in beforeSend and beforeBreadcrumb. Keep in step with that file.
import { redactPersonalData, redactSensitiveText } from './redact'

export type SentryBreadcrumbLike = { message?: string; data?: Record<string, unknown> }

type SentryEventLike = {
  message?: string
  exception?: { values?: { type?: string; value?: string }[] }
  request?: { url?: string }
  breadcrumbs?: SentryBreadcrumbLike[]
  fingerprint?: string[]
  extra?: Record<string, unknown>
  contexts?: Record<string, unknown>
}

function scrubPlainText(value: string): string {
  return redactPersonalData(redactSensitiveText(value))
}

// Encoded values hide phones and emails; only changed values use their scrubbed decoded form.
const QUERY_VALUE = /([?&][^=&#\s]{1,64}=)([^&#\s]{1,2048})/g

function scrubQueryValues(text: string): string {
  return text.replace(QUERY_VALUE, (match, key: string, value: string) => {
    let decoded: string
    try {
      decoded = decodeURIComponent(value.replace(/\+/g, ' '))
    } catch {
      return match
    }
    const scrubbed = scrubPlainText(key + decoded)
    return scrubbed === key + decoded ? match : scrubbed
  })
}

function scrubText(value: string): string {
  return scrubPlainText(scrubQueryValues(value))
}

const PHONE_KEY = /phone|tel|mobile/i
// The SDK normalizes far shallower; drop deeper data rather than send it unscrubbed.
const MAX_SCRUB_DEPTH = 10
const UNSCRUBBABLE = '[Unscrubbable]'

function orUnscrubbable<T>(scrub: () => T): T | typeof UNSCRUBBABLE {
  // A throwing getter, proxy trap or toString must not escape a Sentry hook or pass raw data through.
  try {
    return scrub()
  } catch {
    return UNSCRUBBABLE
  }
}

function scrubTextValues(value: unknown, ancestors: object[] = []): unknown {
  return orUnscrubbable(() => walkTextValues(value, ancestors))
}

function walkTextValues(value: unknown, ancestors: object[] = []): unknown {
  if (typeof value === 'string') return scrubText(value)
  if (typeof value === 'symbol') return scrubText(String(value))
  if (typeof value === 'function') return '[Function]'
  if (value === null || typeof value !== 'object') return value
  if (ancestors.includes(value)) return '[Circular]'
  if (ancestors.length >= MAX_SCRUB_DEPTH) return '[Depth]'
  const next = [...ancestors, value]
  if (value instanceof Error) {
    return {
      name: scrubText(String(value.name)),
      message: scrubText(String(value.message)),
      ...(value.stack !== undefined ? { stack: scrubText(String(value.stack)) } : {}),
    }
  }
  if (Array.isArray(value)) return value.map((item) => scrubTextValues(item, next))
  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      PHONE_KEY.test(key) && typeof nestedValue === 'string'
        ? '[PHONE]'
        : scrubTextValues(nestedValue, next),
    ])
  )
}

function stripOrigin(url: string): string {
  try {
    const parsedUrl = new URL(url)
    // Log text like `write: orders/…` parses with a `write:` scheme; only web URLs carry an origin.
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return scrubText(url)
    }
    return scrubText(`${parsedUrl.pathname}${parsedUrl.search}`)
  } catch {
    return scrubText(url)
  }
}

function scrubUrlValues(value: unknown, ancestors: object[] = []): unknown {
  return orUnscrubbable(() => walkUrlValues(value, ancestors))
}

function walkUrlValues(value: unknown, ancestors: object[] = []): unknown {
  if (typeof value === 'string') return stripOrigin(value)
  if (typeof value === 'symbol') return scrubText(String(value))
  if (typeof value === 'function') return '[Function]'
  if (value === null || typeof value !== 'object') return value
  if (ancestors.includes(value)) return '[Circular]'
  if (ancestors.length >= MAX_SCRUB_DEPTH) return '[Depth]'
  const next = [...ancestors, value]
  if (value instanceof Error) {
    return {
      name: scrubText(String(value.name)),
      message: scrubText(String(value.message)),
      ...(value.stack !== undefined ? { stack: scrubText(String(value.stack)) } : {}),
    }
  }
  if (Array.isArray(value)) return value.map((item) => scrubUrlValues(item, next))
  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      PHONE_KEY.test(key) && typeof nestedValue === 'string'
        ? '[PHONE]'
        : scrubUrlValues(nestedValue, next),
    ])
  )
}

function scrubComponentStack(stack: string): string {
  return scrubText(stack.replace(URL_ORIGIN, '{}'))
}

/**
 * Also the SDK's beforeBreadcrumb: React Native copies each breadcrumb to the native SDK
 * as it is added; native crashes, hangs and watchdog events never pass JS beforeSend.
 * A breadcrumb that cannot be scrubbed is dropped.
 */
export function scrubBreadcrumb<T extends SentryBreadcrumbLike>(breadcrumb: T): T | null {
  const result = orUnscrubbable(() => {
    const scrubbed = scrubBreadcrumbFields(breadcrumb)
    return (scrubbed.data as unknown) === UNSCRUBBABLE ? UNSCRUBBABLE : scrubbed
  })
  return result === UNSCRUBBABLE ? null : result
}

function scrubBreadcrumbFields<T extends SentryBreadcrumbLike>(breadcrumb: T): T {
  if (typeof breadcrumb.message === 'string') breadcrumb.message = scrubText(breadcrumb.message)
  if (breadcrumb.data)
    breadcrumb.data = scrubTextValues(breadcrumb.data) as Record<string, unknown>
  if (typeof breadcrumb.data?.url === 'string') {
    breadcrumb.data.url = stripOrigin(breadcrumb.data.url)
  }
  return breadcrumb
}

export function scrubEvent<T extends SentryEventLike>(event: T): T {
  try {
    return scrubEventSections(event)
  } catch {
    // beforeSend drops an event that throws; send it without sections that may be unscrubbed.
    const sections = [
      'message',
      'exception',
      'request',
      'breadcrumbs',
      'extra',
      'contexts',
      'fingerprint',
    ]
    const result = orUnscrubbable(
      () =>
        Object.fromEntries(Object.entries(event).filter(([key]) => !sections.includes(key))) as T
    )
    return result === UNSCRUBBABLE ? ({} as T) : result
  }
}

function scrubEventSections<T extends SentryEventLike>(event: T): T {
  // The title Sentry shows is the message or the exception value; a log line can
  // embed a Bearer token or a `user:pass@host` URL, and `extra` being scrubbed
  // does nothing for the copy in the title.
  if (typeof event.message === 'string') {
    event.message = scrubText(event.message)
  }
  for (const exception of event.exception?.values ?? []) {
    // Sentry copies Error.name into `type`, so a credential smuggled through a custom
    // error name needs the same scrub as the message.
    if (typeof exception.type === 'string') {
      exception.type = scrubText(exception.type)
    }
    if (typeof exception.value === 'string') {
      exception.value = scrubText(exception.value)
    }
  }
  if (event.request?.url) {
    event.request.url = stripOrigin(event.request.url)
  }
  if (event.breadcrumbs)
    event.breadcrumbs = event.breadcrumbs.filter(
      (breadcrumb) => scrubBreadcrumb(breadcrumb) !== null
    )
  if (event.extra) {
    event.extra = Object.fromEntries(
      Object.entries(event.extra).map(([key, value]) => [key, scrubUrlValues(value)])
    )
  }
  // A React component stack names the bundle URL on every frame on web, and
  // that URL is the merchant's origin. The stack is not itself a URL, so the
  // per-value stripper above never fires on it; strip the origins embedded in
  // it, in both places the boundary report puts it.
  if (event.contexts) event.contexts = scrubTextValues(event.contexts) as Record<string, unknown>
  if (event.fingerprint) event.fingerprint = event.fingerprint.map(scrubText)
  const react = event.contexts?.react
  if (react && typeof react === 'object' && 'componentStack' in react) {
    const stack = (react as { componentStack?: unknown }).componentStack
    if (typeof stack === 'string') {
      (react as { componentStack?: unknown }).componentStack = scrubComponentStack(stack)
    }
  }
  const context = event.extra?.context
  if (context && typeof context === 'object' && 'componentStack' in context) {
    const stack = (context as { componentStack?: unknown }).componentStack
    if (typeof stack === 'string') {
      (context as { componentStack?: unknown }).componentStack = scrubComponentStack(stack)
    }
  }
  return event
}

const URL_ORIGIN = /\bhttps?:\/\/[^\s"'/]+/gi
