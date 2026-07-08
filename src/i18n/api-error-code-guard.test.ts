import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

type Hit = {
  file: string
  line: number
  property: string
}

const root = process.cwd()
const apiRoot = path.join(root, 'src/app/api')
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx'])
const skipPath = /(?:\.test\.|\.spec\.)/
const skipDirs = new Set(['node_modules', '.git', '.next', 'coverage'])
const jsonErrorPropertyPattern = /\b(?:NextResponse|Response)\.json\(\s*\{[^}]*\berror\s*:/g

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

function collectJsonErrorPropertyHitsFromSource(
  source: string,
  filePath: string
): Hit[] {
  const relative = path.relative(root, filePath)
  return Array.from(source.matchAll(jsonErrorPropertyPattern), (match) => ({
    file: relative,
    line: lineForIndex(source, match.index ?? 0),
    property: 'error',
  }))
}

function collectJsonErrorPropertyHits(filePath: string): Hit[] {
  return collectJsonErrorPropertyHitsFromSource(
    readFileSync(filePath, 'utf8'),
    filePath
  )
}

describe('API error localization guard helpers', () => {
  it('detects JSON error fields that would bypass client-side localization', () => {
    const hits = collectJsonErrorPropertyHitsFromSource(
      "return NextResponse.json({ error: 'Something went wrong' }, { status: 400 })\n",
      path.join(root, 'src/app/api/example/route.ts')
    )

    expect(hits).toEqual([
      {
        file: 'src/app/api/example/route.ts',
        line: 1,
        property: 'error',
      },
    ])
  })
})

describe('API error responses', () => {
  it('return stable errorCode fields instead of display-English error fields', () => {
    const hits = walk(apiRoot).flatMap(collectJsonErrorPropertyHits)

    expect(hits).toEqual([])
  })
})
