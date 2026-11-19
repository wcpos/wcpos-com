import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// The first demo/download buttons on /compare/* used to sit in the WCPOS
// choose card, thousands of pixels down on phone; "The short answer" now
// ends with the same actions as well.
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

const ACTIONS = '<CompareChooseActions />'

function countOf(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

function shortAnswerSection(source: string): string {
  const match = source.match(
    /<Section\b[^>]*COMPARE_SHORT_ANSWER_SECTION_CLASS[^>]*>[\s\S]*?<\/Section>/,
  )
  expect(match).not.toBeNull()
  return match![0]
}

describe('/compare/* short answer actions', () => {
  it.each(SLUGS)('%s short answer ends with the demo and download actions', (slug) => {
    const source = readFileSync(resolve(COMPARE_DIR, slug, 'page.tsx'), 'utf8')
    expect(countOf(shortAnswerSection(source), ACTIONS)).toBe(1)
    expect(countOf(source, ACTIONS)).toBe(2)
  })
})
