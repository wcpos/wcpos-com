import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CJK_FONT_SOURCES, cjkFontFilePath } from './pdf-receipt'

describe('receipt CJK font files', () => {
  it.each(CJK_FONT_SOURCES.map((source) => [source.slug, source] as const))(
    'every %s unicode.json subset resolves to a file the loader can read',
    (_slug, source) => {
      const keys = Object.keys(source.unicode)
      expect(keys.length).toBeGreaterThan(0)

      const missing = keys.filter((key) => !existsSync(cjkFontFilePath(source, key)))
      expect(missing).toEqual([])
    }
  )
})
