import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// On phone the /compare hub, /extensions and /support heroes use tighter top
// padding than the shared hero spacing; from sm up they keep the hero values.
const ROOT = process.cwd()

const HEROES = [
  {
    name: '/compare',
    file: 'src/app/[locale]/(main)/compare/page.tsx',
    classes: ['pt-10', 'sm:pt-20', 'md:pt-24', 'lg:pt-28'],
  },
  {
    name: '/extensions',
    file: 'src/app/[locale]/(main)/extensions/page.tsx',
    classes: ['pt-10', 'sm:py-20', 'md:py-24', 'lg:py-28'],
  },
  {
    name: '/support',
    file: 'src/components/support/support-chat.tsx',
    classes: ['pt-10', 'sm:py-20', 'md:py-24', 'lg:py-28'],
  },
] as const

function heroSectionTag(source: string): string | undefined {
  const tags = source.match(/<Section\b[^>]*>/g) ?? []
  return tags.find((tag) => /\bpt-10\b/.test(tag))
}

describe('hero phone padding', () => {
  it.each(HEROES)('$name uses no shared hero spacing', ({ file }) => {
    const source = readFileSync(resolve(ROOT, file), 'utf8')
    expect(source).not.toContain('spacing="hero"')
  })

  it.each(HEROES)('$name hero is tight on phone and unchanged from sm', ({ file, classes }) => {
    const source = readFileSync(resolve(ROOT, file), 'utf8')
    const tag = heroSectionTag(source)
    expect(tag).toBeDefined()
    expect(tag).toContain('spacing="none"')
    const className = tag?.match(/className="([^"]*)"/)?.[1] ?? ''
    const tokens = className.split(/\s+/)
    for (const cls of classes) {
      expect(tokens).toContain(cls)
    }
  })
})
