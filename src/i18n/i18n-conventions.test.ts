import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('i18n conventions documentation', () => {
  it('documents release notes as intentionally English-only external content', () => {
    const conventions = fs.readFileSync(
      path.resolve(process.cwd(), 'I18N_CONVENTIONS.md'),
      'utf8',
    )

    expect(conventions).toContain('Release notes are intentionally English-only')
    expect(conventions).toContain('GitHub')
    expect(conventions).toContain('contentLocale: \'en\'')
    expect(conventions).toContain('surrounding release-history UI')
  })
})
