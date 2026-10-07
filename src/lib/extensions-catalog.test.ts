import { describe, expect, it } from 'vitest'
import catalog from './extensions-catalog.json'
import {
  EXTENSIONS,
  EXTENSIONS_CATALOG_SOURCE,
  EXTENSIONS_DOCS_URL,
} from './extensions-catalog'

describe('extensions catalog', () => {
  it('identifies the pinned upstream source', () => {
    expect(EXTENSIONS_CATALOG_SOURCE.commit).toBe(
      '11aedefc8409c5c84347c22f4f2d8083946b8e43'
    )
    expect(EXTENSIONS_CATALOG_SOURCE.repo).toBe('wcpos/extensions')
  })

  it('maps every catalog entry to its documentation', () => {
    expect(EXTENSIONS).toHaveLength(catalog.extensions.length)
    for (const entry of EXTENSIONS) {
      expect(entry.docsUrl.startsWith('https://docs.wcpos.com/')).toBe(true)
      expect(entry.docsUrl).not.toBe(EXTENSIONS_DOCS_URL)
    }
  })

  it('has unique slugs', () => {
    expect(new Set(EXTENSIONS.map(({ slug }) => slug)).size).toBe(EXTENSIONS.length)
  })
})
