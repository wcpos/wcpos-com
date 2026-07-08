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
const jsonObjectPattern = /\b(?:NextResponse|Response)\.json\(\s*\{(?<body>[^}]*)\}/g
const displayEnglishJsonPropertyPattern = /\b(error|message|statusText)\s*:/g

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

function collectDisplayEnglishJsonPropertyHitsFromSource(
  source: string,
  filePath: string
): Hit[] {
  const relative = path.relative(root, filePath)
  const hits: Hit[] = []

  for (const objectMatch of source.matchAll(jsonObjectPattern)) {
    const body = objectMatch.groups?.body ?? ''
    const bodyStart = (objectMatch.index ?? 0) + objectMatch[0].indexOf(body)

    for (const propertyMatch of body.matchAll(displayEnglishJsonPropertyPattern)) {
      hits.push({
        file: relative,
        line: lineForIndex(source, bodyStart + (propertyMatch.index ?? 0)),
        property: propertyMatch[1] ?? '',
      })
    }
  }

  return hits
}

function collectDisplayEnglishJsonPropertyHits(filePath: string): Hit[] {
  return collectDisplayEnglishJsonPropertyHitsFromSource(
    readFileSync(filePath, 'utf8'),
    filePath
  )
}

describe('API error localization guard helpers', () => {
  it('detects JSON error fields that would bypass client-side localization', () => {
    const hits = collectDisplayEnglishJsonPropertyHitsFromSource(
      "return NextResponse.json({ error: 'Something went wrong', message: 'Try again', statusText: 'Bad request' }, { status: 400 })\n",
      path.join(root, 'src/app/api/example/route.ts')
    )

    expect(hits).toEqual([
      {
        file: 'src/app/api/example/route.ts',
        line: 1,
        property: 'error',
      },
      {
        file: 'src/app/api/example/route.ts',
        line: 1,
        property: 'message',
      },
      {
        file: 'src/app/api/example/route.ts',
        line: 1,
        property: 'statusText',
      },
    ])
  })
})

describe('API error responses', () => {
  it('return stable codes instead of display-English error, message, or statusText fields', () => {
    const hits = walk(apiRoot).flatMap(collectDisplayEnglishJsonPropertyHits)

    expect(hits).toEqual([])
  })
})
