import { Resolver } from 'node:dns/promises'

/**
 * Does this email address's domain actually accept mail?
 *
 * Motivated by a real signup: a customer typed `layed3d.org.uk` instead of
 * `layer3d.org.uk`. The address is perfectly well-formed, `type="email"`
 * accepted it, and every email we have sent since has hard-bounced — receipt,
 * licence key, and (fatally) password reset. The typo'd domain is not
 * registered at all, which DNS can tell us in a few milliseconds.
 *
 * This catches only unreachable DOMAINS. A wrong mailbox at a real domain
 * (`inof@layer3d.org.uk`) is undetectable here by design — no protocol will
 * tell you truthfully whether a mailbox exists, and probing for it gets you
 * blocklisted. That case is caught after the fact by bounce handling.
 *
 * Fails SOFT. A resolver timeout, SERVFAIL, or any answer we cannot interpret
 * returns `unverified`, which callers must treat as permission to proceed.
 * Blocking a paying customer because our DNS lookup was slow would cost far
 * more than the typo it was meant to prevent.
 */

/** Beyond this, give up and let the signup through. */
const DNS_TIMEOUT_MS = 2500

/** Domains change mail hosting rarely; a short cache spares repeat lookups. */
const CACHE_TTL_MS = 10 * 60 * 1000
const CACHE_MAX_ENTRIES = 500

export type EmailDomainVerdict =
  /** Has an MX record, or an address record acting as an implicit MX. */
  | 'deliverable'
  /** Authoritative NXDOMAIN — the domain is not registered. */
  | 'no_such_domain'
  /** Registered, but publishes nothing that can accept mail. */
  | 'no_mail_exchanger'
  /** Lookup failed or timed out. Callers must proceed. */
  | 'unverified'

/** Only the two authoritative negatives justify rejecting an address. */
export function isUndeliverableVerdict(verdict: EmailDomainVerdict): boolean {
  return verdict === 'no_such_domain' || verdict === 'no_mail_exchanger'
}

/**
 * Split off the domain. Deliberately strict about the things that would make
 * a DNS query meaningless (no `@`, empty halves, whitespace, a bare TLD)
 * rather than attempting full RFC 5322 validation, which is a famous trap.
 */
const DNS_LABEL = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

export function emailDomain(email: string): string | null {
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.lastIndexOf('@')
  if (at <= 0 || at === trimmed.length - 1) return null

  const domain = trimmed.slice(at + 1)
  if (/\s/.test(trimmed)) return null

  // Validate label by label. A single permissive pattern lets through shapes
  // like `.example.com` and `example..com`, which resolve to nothing but read
  // as valid.
  const labels = domain.split('.')
  if (labels.length < 2) return null
  if (!labels.every((label) => DNS_LABEL.test(label))) return null
  // A public mail domain ends in an alphabetic TLD.
  if (!/^[a-z]{2,}$/.test(labels[labels.length - 1])) return null

  return domain
}

const cache = new Map<string, { verdict: EmailDomainVerdict; at: number }>()

function readCache(domain: string): EmailDomainVerdict | null {
  const hit = cache.get(domain)
  if (!hit) return null
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(domain)
    return null
  }
  return hit.verdict
}

function writeCache(domain: string, verdict: EmailDomainVerdict): void {
  // Never cache a soft failure: the next attempt should retry, not inherit a
  // transient resolver outage for the whole TTL.
  if (verdict === 'unverified') return
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next()
    if (!oldest.done) cache.delete(oldest.value)
  }
  cache.set(domain, { verdict, at: Date.now() })
}

/** Exposed for tests; also lets a long-lived server drop stale entries. */
export function clearEmailDomainCache(): void {
  cache.clear()
}

function isNotFound(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  return code === 'ENOTFOUND' || code === 'NXDOMAIN'
}

function isNoRecords(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  return code === 'ENODATA' || code === 'ENOTIMP'
}

async function resolveVerdict(domain: string): Promise<EmailDomainVerdict> {
  const resolver = new Resolver({ timeout: DNS_TIMEOUT_MS, tries: 1 })

  try {
    const mx = await resolver.resolveMx(domain)
    if (mx.length > 0 && mx.some((record) => record.exchange)) {
      return 'deliverable'
    }
  } catch (error) {
    if (isNotFound(error)) return 'no_such_domain'
    if (!isNoRecords(error)) return 'unverified'
    // ENODATA: the domain exists but publishes no MX. Fall through to the
    // implicit-MX check below.
  }

  // RFC 5321 §5.1: a domain with an address record but no MX still accepts
  // mail at that host. Small business domains do this more often than you
  // would hope, so skipping it would reject real customers.
  try {
    const a = await resolver.resolve4(domain)
    if (a.length > 0) return 'deliverable'
  } catch (error) {
    if (isNotFound(error)) return 'no_such_domain'
    if (!isNoRecords(error)) return 'unverified'
  }

  try {
    const aaaa = await resolver.resolve6(domain)
    if (aaaa.length > 0) return 'deliverable'
  } catch (error) {
    if (isNotFound(error)) return 'no_such_domain'
    if (!isNoRecords(error)) return 'unverified'
  }

  return 'no_mail_exchanger'
}

/**
 * Resolve an address's domain. Never rejects.
 */
export async function verifyEmailDomain(
  email: string
): Promise<EmailDomainVerdict> {
  const domain = emailDomain(email)
  if (!domain) return 'no_such_domain'

  const cached = readCache(domain)
  if (cached) return cached

  let timer: NodeJS.Timeout | undefined
  try {
    // The resolver's own timeout covers a silent server, but not a resolver
    // that never settles. This is the outer guarantee that registration
    // cannot hang on DNS.
    const verdict = await Promise.race([
      resolveVerdict(domain),
      new Promise<EmailDomainVerdict>((resolve) => {
        timer = setTimeout(() => resolve('unverified'), DNS_TIMEOUT_MS)
      }),
    ])
    writeCache(domain, verdict)
    return verdict
  } catch {
    return 'unverified'
  } finally {
    if (timer) clearTimeout(timer)
  }
}
