import { describe, expect, it, vi } from 'vitest'
import { resolveLayoutLocale, resolveLocale } from './resolve-locale'

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_HTTP_ERROR_FALLBACK;404')
  }),
}))

describe('resolveLocale', () => {
  it('returns a valid locale unchanged', () => {
    expect(resolveLocale('de')).toBe('de')
  })

  it('throws notFound() for an invalid locale', () => {
    expect(() => resolveLocale('nonexistent.xyz')).toThrow()
  })
})

describe('resolveLayoutLocale', () => {
  it('returns a valid locale unchanged', () => {
    expect(resolveLayoutLocale('ja')).toBe('ja')
  })

  it('falls back to the default locale instead of throwing', () => {
    expect(resolveLayoutLocale('nonexistent.xyz')).toBe('en')
    expect(resolveLayoutLocale('')).toBe('en')
  })
})
