import { describe, expect, it } from 'vitest'
import {
  normalizeReleaseVersion,
} from './pro-downloads'

describe('normalizeReleaseVersion', () => {
  it('removes a leading v prefix', () => {
    expect(normalizeReleaseVersion('v1.2.3')).toBe('1.2.3')
  })
})
