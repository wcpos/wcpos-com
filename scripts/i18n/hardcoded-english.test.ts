import { describe, expect, it } from 'vitest'
import { candidate, looksCodeOrConfig } from './hardcoded-english'

describe('hard-coded English candidates', () => {
  it('reports Default only in UI text', () => {
    expect(candidate('Default', true)).toBe('Default')
    expect(candidate('Default')).toBeNull()
  })

  it.each(['onClick', 'px-4', 'utf-8'])('rejects %s even in UI text', (value) => {
    expect(candidate(value, true)).toBeNull()
  })

  it('keeps Pro with or without UI context', () => {
    expect(candidate('Pro', true)).toBe('Pro')
    expect(candidate('Pro')).toBe('Pro')
  })

  it.each(['onClick', 'px-4', 'utf-8'])('recognises %s as code or config', (value) => {
    expect(looksCodeOrConfig(value)).toBe(true)
  })
})
