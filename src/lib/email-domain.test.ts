import { beforeEach, describe, expect, it, vi } from 'vitest'

const resolveMx = vi.hoisted(() => vi.fn())
const resolve4 = vi.hoisted(() => vi.fn())
const resolve6 = vi.hoisted(() => vi.fn())

vi.mock('node:dns/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:dns/promises')>()
  class MockResolver {
    resolveMx = resolveMx
    resolve4 = resolve4
    resolve6 = resolve6
  }
  return { ...actual, default: { ...actual, Resolver: MockResolver }, Resolver: MockResolver }
})

import {
  clearEmailDomainCache,
  emailDomain,
  isUndeliverableVerdict,
  verifyEmailDomain,
} from './email-domain'

function dnsError(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code })
}

beforeEach(() => {
  vi.clearAllMocks()
  clearEmailDomainCache()
  resolve4.mockRejectedValue(dnsError('ENODATA'))
  resolve6.mockRejectedValue(dnsError('ENODATA'))
})

describe('emailDomain', () => {
  it('extracts the domain, lowercased and trimmed', () => {
    expect(emailDomain('  Info@Layer3D.org.uk ')).toBe('layer3d.org.uk')
  })

  it('takes the last @ so plus-addressing and quotes do not confuse it', () => {
    expect(emailDomain('a@b@example.com')).toBe('example.com')
    expect(emailDomain('user+tag@example.com')).toBe('example.com')
  })

  it('rejects shapes that would make a DNS query meaningless', () => {
    for (const bad of [
      'no-at-sign',
      '@example.com',
      'user@',
      'user@localhost',
      'user@example',
      'user@exa mple.com',
      'user@.example.com',
      'user@example..com',
    ]) {
      expect(emailDomain(bad)).toBeNull()
    }
  })
})

describe('verifyEmailDomain', () => {
  it('accepts a domain with MX records', async () => {
    resolveMx.mockResolvedValue([
      { exchange: 'layer3d-org-uk.mail.protection.outlook.com', priority: 0 },
    ])
    await expect(verifyEmailDomain('info@layer3d.org.uk')).resolves.toBe(
      'deliverable'
    )
  })

  it('reports an unregistered domain as no_such_domain', async () => {
    // The real incident: layed3d.org.uk is NXDOMAIN, so every email to it
    // hard-bounced.
    resolveMx.mockRejectedValue(dnsError('ENOTFOUND'))
    await expect(verifyEmailDomain('info@layed3d.org.uk')).resolves.toBe(
      'no_such_domain'
    )
  })

  it('accepts a domain with no MX but an A record (implicit MX)', async () => {
    resolveMx.mockRejectedValue(dnsError('ENODATA'))
    resolve4.mockResolvedValue(['203.0.113.10'])
    await expect(verifyEmailDomain('owner@smallshop.example')).resolves.toBe(
      'deliverable'
    )
  })

  it('accepts an IPv6-only domain', async () => {
    resolveMx.mockRejectedValue(dnsError('ENODATA'))
    resolve6.mockResolvedValue(['2001:db8::1'])
    await expect(verifyEmailDomain('owner@v6.example')).resolves.toBe(
      'deliverable'
    )
  })

  it('reports a registered domain that publishes no mail host', async () => {
    resolveMx.mockRejectedValue(dnsError('ENODATA'))
    await expect(verifyEmailDomain('someone@parked.example')).resolves.toBe(
      'no_mail_exchanger'
    )
  })

  it('treats an empty MX answer as no mail exchanger, not deliverable', async () => {
    resolveMx.mockResolvedValue([])
    await expect(verifyEmailDomain('someone@empty.example')).resolves.toBe(
      'no_mail_exchanger'
    )
  })

  it('fails soft on resolver failure so signup is never blocked by DNS', async () => {
    for (const code of ['ETIMEOUT', 'SERVFAIL', 'ECONNREFUSED', 'EREFUSED']) {
      clearEmailDomainCache()
      resolveMx.mockRejectedValue(dnsError(code))
      await expect(verifyEmailDomain('info@layer3d.org.uk')).resolves.toBe(
        'unverified'
      )
    }
  })

  it('rejects a malformed address without attempting a lookup', async () => {
    await expect(verifyEmailDomain('not-an-email')).resolves.toBe(
      'no_such_domain'
    )
    expect(resolveMx).not.toHaveBeenCalled()
  })

  it('caches a definitive verdict', async () => {
    resolveMx.mockResolvedValue([{ exchange: 'mx.example.com', priority: 10 }])
    await verifyEmailDomain('a@example.com')
    await verifyEmailDomain('b@example.com')
    expect(resolveMx).toHaveBeenCalledTimes(1)
  })

  it('never caches a soft failure', async () => {
    // A resolver blip must not lock in "unverified" for the whole TTL.
    resolveMx.mockRejectedValue(dnsError('ETIMEOUT'))
    await verifyEmailDomain('a@flaky.example')
    resolveMx.mockResolvedValue([{ exchange: 'mx.flaky.example', priority: 1 }])
    await expect(verifyEmailDomain('a@flaky.example')).resolves.toBe(
      'deliverable'
    )
    expect(resolveMx).toHaveBeenCalledTimes(2)
  })
})

describe('isUndeliverableVerdict', () => {
  it('only treats the two authoritative negatives as grounds to reject', () => {
    expect(isUndeliverableVerdict('no_such_domain')).toBe(true)
    expect(isUndeliverableVerdict('no_mail_exchanger')).toBe(true)
    expect(isUndeliverableVerdict('unverified')).toBe(false)
    expect(isUndeliverableVerdict('deliverable')).toBe(false)
  })
})
