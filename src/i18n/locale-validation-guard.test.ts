import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const appDir = path.resolve(process.cwd(), 'src/app/[locale]')

function pageFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return pageFiles(fullPath)
    return entry.name === 'page.tsx' ? [fullPath] : []
  })
}

/**
 * Guards the invariant behind the dotted-path 404 fix (see
 * resolveLayoutLocale in src/i18n/resolve-locale.ts):
 *
 * - The [locale] layout must never throw notFound() for an invalid locale
 *   (a production layout-level notFound() escapes the root not-found
 *   boundary under cacheComponents and 500s), so it must use the
 *   non-throwing resolveLayoutLocale.
 * - Because the layout is tolerant, rejecting invalid locales falls to the
 *   routes below it: every page must call the throwing resolveLocale (the
 *   [...rest] catch-all is exempt — it is an unconditional notFound()).
 */
describe('[locale] locale validation', () => {
  it('the [locale] layout uses the non-throwing resolveLayoutLocale', () => {
    const layout = fs.readFileSync(path.join(appDir, 'layout.tsx'), 'utf8')

    expect(layout).toContain('resolveLayoutLocale(')
    expect(layout).not.toContain('resolveLocale(')
  })

  it('every page below the tolerant layout validates the locale', () => {
    const pages = pageFiles(appDir).filter(
      (file) => !file.includes('[...rest]')
    )

    expect(pages.length).toBeGreaterThan(0)
    for (const file of pages) {
      const source = fs.readFileSync(file, 'utf8')
      expect(
        source.includes('resolveLocale('),
        `${path.relative(process.cwd(), file)} must call resolveLocale() so ` +
          'invalid locales 404 (the [locale] layout no longer rejects them)'
      ).toBe(true)
    }
  })
})
