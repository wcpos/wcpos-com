import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// On phone the /compare/* hero is left-aligned to match the back-link
// breadcrumb above it and "The short answer" below it; from `sm` up the
// SectionHeading's own text-center still applies.
const COMPARE_DIR = resolve(process.cwd(), 'src/app/[locale]/(main)/compare')

const SLUGS = [
  'square',
  'foosales',
  'oliver-pos',
  'vitepos',
  'woocommerce-pos',
  'yith-pos',
  'jovvie',
] as const

function heroHeadings(source: string): string[] {
  const elements = source.match(/<SectionHeading\b[^>]*\/>/g) ?? []
  return elements.filter((element) => element.includes('as="h1"'))
}

describe('/compare/* hero heading alignment', () => {
  it.each(SLUGS)('%s hero is left-aligned below sm', (slug) => {
    const source = readFileSync(resolve(COMPARE_DIR, slug, 'page.tsx'), 'utf8')
    const heroes = heroHeadings(source)
    expect(heroes).toHaveLength(1)
    expect(heroes[0]).toContain('className="max-sm:text-left"')
  })
})
