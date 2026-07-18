import { describe, expect, it } from 'vitest'
import { cleanReleaseNotes } from './release-notes'

describe('cleanReleaseNotes', () => {
  it('strips a leading "Changelog" heading, emoji included', () => {
    const body = '## 🛠️ Changelog\n\n### 🔒 Security\n- Hardened templates'
    expect(cleanReleaseNotes(body, 'v1.9.9')).toBe(
      '### 🔒 Security\n- Hardened templates'
    )
  })

  it('strips a leading "What\'s new in <version>" heading', () => {
    const body = "## What's new in 1.9.5\n\n**Fixed a crash.** Details."
    expect(cleanReleaseNotes(body, 'v1.9.5')).toBe('**Fixed a crash.** Details.')
  })

  it('strips a heading that is just the release version', () => {
    expect(cleanReleaseNotes('# v1.9.2\n- Fixes', 'v1.9.2')).toBe('- Fixes')
    expect(cleanReleaseNotes('# 1.9.2\n- Fixes', 'v1.9.2')).toBe('- Fixes')
  })

  it('strips redundant headings written with closing ATX hashes', () => {
    expect(cleanReleaseNotes('## Changelog ##\n\n- Fixes', 'v1.9.9')).toBe(
      '- Fixes'
    )
    expect(cleanReleaseNotes('# v1.9.2 #\n- Fixes', 'v1.9.2')).toBe('- Fixes')
  })

  it('keeps a descriptive feature headline', () => {
    const body = '## Receipts can now show savings\n\nReceipt templates…'
    expect(cleanReleaseNotes(body, 'v1.9.7')).toBe(body)
  })

  it('only inspects the first heading', () => {
    const body = '- A fix\n\n## Changelog\n- More'
    expect(cleanReleaseNotes(body)).toBe(body)
  })

  it('handles empty and whitespace-only bodies', () => {
    expect(cleanReleaseNotes('')).toBe('')
    expect(cleanReleaseNotes('  \n\n ')).toBe('')
    expect(cleanReleaseNotes('## Changelog\n\n')).toBe('')
  })
})
