import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

type Hit = {
  file: string
  kind: 'text' | 'attribute'
  text: string
}

const root = process.cwd()
const scanRoots = ['src/app', 'src/components']
const sourceExtensions = new Set(['.tsx', '.jsx'])

const skipPath = /(?:\.test\.|\.spec\.|\.stories\.|dev-fixture\.tsx?$)/
const skipDirs = new Set([
  'node_modules',
  '.git',
  '.next',
  'coverage',
  'test-results',
  'playwright-report',
])

const checkedAttributes = ['aria-label', 'alt', 'placeholder', 'title']
const jsxTextPattern = />\s*([A-Za-z][A-Za-z0-9 ,.'’!?/&+()#:\-]{1,})\s*(?=<\/)/g
const attributePattern = new RegExp(
  `\\b(${checkedAttributes.join('|')})\\s*=\\s*"([^"]*[A-Za-z][^"]*)"`,
  'g'
)

/**
 * Brand and product names are intentionally stable across locales. Every other
 * literal English UI string must flow through next-intl messages (or another
 * explicit localization boundary) before it reaches rendered JSX.
 */
const allowed = new Set([
  'src/app/[locale]/not-found.tsx|text|WCPOS Pro',
  'src/app/not-found.tsx|text|WCPOS Pro',
  'src/app/[locale]/(auth)/login/login-page-client.tsx|text|Google',
  'src/app/[locale]/(auth)/login/login-page-client.tsx|text|GitHub',
  'src/app/[locale]/(auth)/login/login-page-client.tsx|text|Discord',
  'src/app/[locale]/account/admin/page.tsx|attribute|customer@example.com',
  'src/components/home/features-section.tsx|text|Pro',
  'src/components/home/benefits-section.tsx|text|WooCommerce',
  'src/components/main/site-header.tsx|text|WCPOS',
  'src/components/pro/checkout/account-step.tsx|attribute|you@yourstore.com',
  'src/components/pro/checkout/payment-step.tsx|text|PayPal',
])

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

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function isLikelyEnglishUiCopy(text: string): boolean {
  const normalized = normalizeText(text)
  if (normalized.length < 3) return false
  if (!/[A-Za-z]/.test(normalized)) return false
  if (/^[A-Z0-9_]+$/.test(normalized) && normalized !== 'WCPOS') return false
  if (
    /^[a-z0-9_.:/#-]+$/.test(normalized) &&
    /[0-9_.:/#-]/.test(normalized)
  ) {
    return false
  }
  return true
}

function collectHitsFromSource(source: string, file: string): Hit[] {
  const hits: Hit[] = []

  for (const match of source.matchAll(jsxTextPattern)) {
    if (typeof match.index === 'number' && source[match.index - 1] === '=') {
      continue
    }
    const text = normalizeText(match[1] ?? '')
    if (isLikelyEnglishUiCopy(text)) {
      hits.push({ file, kind: 'text', text })
    }
  }

  for (const match of source.matchAll(attributePattern)) {
    const text = normalizeText(match[2] ?? '')
    if (isLikelyEnglishUiCopy(text)) {
      hits.push({ file, kind: 'attribute', text })
    }
  }

  return hits
}

function collectHits(filePath: string): Hit[] {
  return collectHitsFromSource(
    readFileSync(filePath, 'utf8'),
    path.relative(root, filePath)
  )
}

describe('rendered JSX copy guard helpers', () => {
  it('detects uppercase and lowercase rendered English text', () => {
    const hits = collectHitsFromSource(
      '<p>Welcome back</p><p>or continue with email</p><button>continue</button><span>checkout</span>',
      'src/components/example.tsx'
    )

    expect(hits).toEqual([
      {
        file: 'src/components/example.tsx',
        kind: 'text',
        text: 'Welcome back',
      },
      {
        file: 'src/components/example.tsx',
        kind: 'text',
        text: 'or continue with email',
      },
      {
        file: 'src/components/example.tsx',
        kind: 'text',
        text: 'continue',
      },
      {
        file: 'src/components/example.tsx',
        kind: 'text',
        text: 'checkout',
      },
    ])
  })
})

describe('rendered JSX copy', () => {
  it('does not hard-code English UI strings outside the brand allowlist', () => {
    const hits = scanRoots
      .flatMap((scanRoot) => walk(path.join(root, scanRoot)))
      .flatMap(collectHits)
      .filter((hit) => !allowed.has(`${hit.file}|${hit.kind}|${hit.text}`))

    expect(hits).toEqual([])
  })
})
