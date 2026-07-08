import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  resolveTurnstileSiteKey,
  TEST_TURNSTILE_SITE_KEY,
} from './turnstile-keys'

afterEach(() => vi.unstubAllEnvs())

describe('resolveTurnstileSiteKey', () => {
  it('resolves the committed production widget on live hosts', () => {
    for (const host of ['wcpos.com', 'www.wcpos.com', 'wcpos.com:443']) {
      const key = resolveTurnstileSiteKey(host)
      expect(key, host).toMatch(/^0x/)
      expect(key).not.toBe(TEST_TURNSTILE_SITE_KEY)
    }
  })

  it('resolves the always-pass demo widget on test hosts', () => {
    for (const host of ['beta.wcpos.com', 'wcpos-abc123-wcpos.vercel.app']) {
      expect(resolveTurnstileSiteKey(host), host).toBe(TEST_TURNSTILE_SITE_KEY)
    }
  })

  it('renders no widget on dev hosts', () => {
    for (const host of ['localhost:3000', '127.0.0.1:3000', undefined, null, '']) {
      expect(resolveTurnstileSiteKey(host), String(host)).toBeNull()
    }
  })

  it('honours a valid-looking env override on live hosts only', () => {
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', '0xROTATED')
    expect(resolveTurnstileSiteKey('wcpos.com')).toBe('0xROTATED')
    expect(resolveTurnstileSiteKey('beta.wcpos.com')).toBe(TEST_TURNSTILE_SITE_KEY)
  })

  it('ignores an empty or junk env value in favour of the committed literal', () => {
    for (const junk of ['', '   ', 'not-a-key', '1x00000000000000000000AA']) {
      vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', junk)
      expect(resolveTurnstileSiteKey('wcpos.com'), JSON.stringify(junk)).toMatch(/^0x/)
      expect(resolveTurnstileSiteKey('wcpos.com')).not.toBe(junk)
    }
  })
})
