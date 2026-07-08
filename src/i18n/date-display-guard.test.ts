import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

type DirectLocaleDateHit = {
  file: string
  line: number
  method: string
}

type AmbiguousDateHit = {
  file: string
  path?: string
  line?: number
  value: string
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

const root = process.cwd()
const sourceRoots = ['src']
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx'])
const skipPath = /(?:\.test\.|\.spec\.|\.stories\.|dev-fixture\.tsx?$)/
const skipDirs = new Set([
  'node_modules',
  '.git',
  '.next',
  'coverage',
  'test-results',
  'playwright-report',
])

const directLocaleDatePattern = /\.\s*(toLocaleDateString|toLocaleTimeString|toLocaleString)\s*\(/g
const ambiguousNumericDatePattern = /(?<![\d./-])\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}(?![\d./-])/
const quotedStringPattern = /'((?:\\.|[^'\\\r\n])*)'|"((?:\\.|[^"\\\r\n])*)"|`((?:\\.|(?!`)[\s\S])*)`/g
const jsxTextDatePattern = />(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})<\//g

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (skipDirs.has(entry)) continue
    const filePath = path.join(dir, entry)
    const stat = statSync(filePath)
    if (stat.isDirectory()) {
      walk(filePath, out)
    } else if (
      sourceExtensions.has(path.extname(filePath)) &&
      !skipPath.test(filePath)
    ) {
      out.push(filePath)
    }
  }
  return out
}

function lineForIndex(source: string, index: number): number {
  return source.slice(0, index).split('\n').length
}

function collectDirectLocaleDateHits(filePath: string): DirectLocaleDateHit[] {
  const source = readFileSync(filePath, 'utf8')
  const relative = path.relative(root, filePath)

  if (relative === 'src/lib/date-format.ts') {
    return []
  }

  return Array.from(source.matchAll(directLocaleDatePattern), (match) => ({
    file: relative,
    line: lineForIndex(source, match.index ?? 0),
    method: match[1] ?? '',
  }))
}

function decodeSourceStringLiteral(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\`/g, '`')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

function isSvgPathLiteral(value: string): boolean {
  return (
    value.length > 80 &&
    /^[Mm][0-9 .,\-MmCcLlHhVvSsQqTtAaZz]+$/.test(value)
  )
}

function collectAmbiguousSourceDateHits(filePath: string): AmbiguousDateHit[] {
  const source = readFileSync(filePath, 'utf8')
  const relative = path.relative(root, filePath)
  const hits: AmbiguousDateHit[] = []

  for (const match of source.matchAll(quotedStringPattern)) {
    const rawValue = match[1] ?? match[2] ?? match[3] ?? ''
    const value = decodeSourceStringLiteral(rawValue)
    if (isSvgPathLiteral(value)) continue
    if (ambiguousNumericDatePattern.test(value)) {
      hits.push({
        file: relative,
        line: lineForIndex(source, match.index ?? 0),
        value,
      })
    }
  }

  for (const match of source.matchAll(jsxTextDatePattern)) {
    hits.push({
      file: relative,
      line: lineForIndex(source, match.index ?? 0),
      value: match[1] ?? '',
    })
  }

  return hits
}

function collectAmbiguousMessageDateHits(
  value: JsonValue,
  file: string,
  keyPath: string[] = []
): AmbiguousDateHit[] {
  if (typeof value === 'string') {
    return ambiguousNumericDatePattern.test(value)
      ? [{ file, path: keyPath.join('.'), value }]
      : []
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectAmbiguousMessageDateHits(item, file, [...keyPath, String(index)])
    )
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, nestedValue]) =>
      collectAmbiguousMessageDateHits(nestedValue, file, [...keyPath, key])
    )
  }

  return []
}

function sourceFiles(): string[] {
  return sourceRoots.flatMap((sourceRoot) => walk(path.join(root, sourceRoot)))
}

describe('date display localization guard helpers', () => {
  it('detects direct toLocale date formatting calls in source', () => {
    const fixture = path.join(root, 'src/components/example.tsx')
    const hit = collectDirectLocaleDateHitsFromSource(
      'const label = order.createdAt.toLocaleDateString()\n',
      fixture
    )

    expect(hit).toEqual([
      {
        file: 'src/components/example.tsx',
        line: 1,
        method: 'toLocaleDateString',
      },
    ])
  })

  it('detects ambiguous numeric date strings in source literals and messages', () => {
    const fixture = path.join(root, 'src/components/example.tsx')
    const sourceHit = collectAmbiguousSourceDateHitsFromSource(
      [
        'const placeholder = "02/01/2021"',
        'const dottedPlaceholder = "02.01.2021"',
        'export function Example() { return <time>02/01/2021</time> }',
        '',
      ].join('\n'),
      fixture
    )
    const messageHit = collectAmbiguousMessageDateHits(
      {
        account: {
          example: 'Paid on 02-01-2021',
          dottedExample: 'Paid on 02.01.2021',
        },
      },
      'messages/en.json'
    )

    expect(sourceHit).toEqual([
      {
        file: 'src/components/example.tsx',
        line: 1,
        value: '02/01/2021',
      },
      {
        file: 'src/components/example.tsx',
        line: 2,
        value: '02.01.2021',
      },
      {
        file: 'src/components/example.tsx',
        line: 3,
        value: '02/01/2021',
      },
    ])
    expect(messageHit).toEqual([
      {
        file: 'messages/en.json',
        path: 'account.example',
        value: 'Paid on 02-01-2021',
      },
      {
        file: 'messages/en.json',
        path: 'account.dottedExample',
        value: 'Paid on 02.01.2021',
      },
    ])
  })
})

describe('date displays', () => {
  it('use the shared locale-aware formatter instead of direct toLocale date methods', () => {
    const hits = sourceFiles().flatMap(collectDirectLocaleDateHits)

    expect(hits).toEqual([])
  })

  it('do not ship ambiguous numeric date strings in UI source or messages', () => {
    const sourceHits = sourceFiles().flatMap(collectAmbiguousSourceDateHits)
    const messageHits = readdirSync(path.join(root, 'messages'))
      .filter((file) => file.endsWith('.json'))
      .flatMap((file) => {
        const relative = path.join('messages', file)
        const raw = readFileSync(path.join(root, relative), 'utf8')
        return collectAmbiguousMessageDateHits(JSON.parse(raw) as JsonValue, relative)
      })

    expect([...sourceHits, ...messageHits]).toEqual([])
  })
})

function collectDirectLocaleDateHitsFromSource(
  source: string,
  filePath: string
): DirectLocaleDateHit[] {
  const relative = path.relative(root, filePath)
  return Array.from(source.matchAll(directLocaleDatePattern), (match) => ({
    file: relative,
    line: lineForIndex(source, match.index ?? 0),
    method: match[1] ?? '',
  }))
}

function collectAmbiguousSourceDateHitsFromSource(
  source: string,
  filePath: string
): AmbiguousDateHit[] {
  const relative = path.relative(root, filePath)
  const hits: AmbiguousDateHit[] = []

  for (const match of source.matchAll(quotedStringPattern)) {
    const value = decodeSourceStringLiteral(match[1] ?? match[2] ?? match[3] ?? '')
    if (isSvgPathLiteral(value)) continue
    if (ambiguousNumericDatePattern.test(value)) {
      hits.push({
        file: relative,
        line: lineForIndex(source, match.index ?? 0),
        value,
      })
    }
  }

  for (const match of source.matchAll(jsxTextDatePattern)) {
    hits.push({
      file: relative,
      line: lineForIndex(source, match.index ?? 0),
      value: match[1] ?? '',
    })
  }

  return hits
}
