import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  COMPARE_HERO_SECTION_CLASS,
  COMPARE_SHORT_ANSWER_SECTION_CLASS,
} from '@/components/compare/compare-layout'

// On phone the /compare/* hero and "The short answer" use tighter padding
// than the shared Section spacings; desktop keeps the hero padding as it was.
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

function sectionTagsWith(source: string, className: string): string[] {
  const tags = source.match(/<Section\b[^>]*>/g) ?? []
  return tags.filter((tag) => tag.includes(className))
}

function countOf(source: string, needle: string): number {
  return source.split(needle).length - 1
}

describe('/compare/* top-of-page spacing', () => {
  it.each(SLUGS)('%s uses the compare hero and short-answer classes', (slug) => {
    const source = readFileSync(resolve(COMPARE_DIR, slug, 'page.tsx'), 'utf8')

    for (const constant of [
      'COMPARE_HERO_SECTION_CLASS',
      'COMPARE_SHORT_ANSWER_SECTION_CLASS',
    ]) {
      const attr = `className={${constant}}`
      expect(countOf(source, attr)).toBe(1)
      const tags = sectionTagsWith(source, attr)
      expect(tags).toHaveLength(1)
      expect(tags[0]).toContain('spacing="none"')
    }

    expect(source).not.toContain('spacing="hero"')
  })

  it('the constants use no py- classes', () => {
    for (const value of [
      COMPARE_HERO_SECTION_CLASS,
      COMPARE_SHORT_ANSWER_SECTION_CLASS,
    ]) {
      expect(value.split(/\s+/).some((cls) => /(^|:)py-/.test(cls))).toBe(false)
    }
  })

  it('the hero keeps its desktop padding', () => {
    const classes = COMPARE_HERO_SECTION_CLASS.split(/\s+/)
    for (const cls of ['md:pt-24', 'lg:pt-28', 'md:pb-10', 'lg:pb-12']) {
      expect(classes).toContain(cls)
    }
  })
})
