import { describe, expect, it } from 'vitest'
import { resolvePlatform } from './platforms'

describe('resolvePlatform', () => {
  it('detects Windows from the platform string', () => {
    expect(resolvePlatform('Mozilla/5.0 (Windows NT 10.0)', 'Win32', 0)).toBe('win')
  })

  it('detects macOS (defaults to Apple Silicon build)', () => {
    expect(
      resolvePlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'MacIntel', 0),
    ).toBe('mac-arm')
  })

  it('detects Linux but not Android-on-Linux', () => {
    expect(resolvePlatform('Mozilla/5.0 (X11; Linux x86_64)', 'Linux x86_64', 0)).toBe(
      'linux',
    )
  })

  it('detects iPhone', () => {
    expect(resolvePlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', 'iPhone', 5)).toBe(
      'ios',
    )
  })

  it('treats iPadOS reporting as MacIntel-with-touch as iOS', () => {
    expect(resolvePlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'MacIntel', 5)).toBe(
      'ios',
    )
  })

  it('detects Android (even though it is Linux-based)', () => {
    expect(
      resolvePlatform('Mozilla/5.0 (Linux; Android 14; Pixel)', 'Linux armv8l', 5),
    ).toBe('android')
  })

  it('falls back to macOS for an unknown environment', () => {
    expect(resolvePlatform('', '', 0)).toBe('mac-arm')
  })
})
