#!/usr/bin/env tsx
import { parse, type TSESTree } from '@typescript-eslint/typescript-estree'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

type Hit = {
  file: string
  line: number
  col: number
  category: string
  attr: string | null
  text: string
}

type AllowEntry = {
  id: string
  file: string
  category: string
  attr: string | null
  text: string
  count: number
}

type Allowlist = {
  version: 1
  generatedBy: string
  updatedAt: string
  scope: string[]
  entries: AllowEntry[]
}

const root = process.cwd()
const args = new Set(process.argv.slice(2))
const update = args.has('--update')
const json = args.has('--json')
const csv = args.has('--csv')

const scope = ['src/app', 'src/components', 'src/lib', 'src/services']
const allowlistPath = path.join(root, 'scripts/i18n/hardcoded-english-allowlist.json')
const reportPath = path.join(root, 'reports/i18n/hardcoded-english.csv')

const skipDir = new Set([
  'node_modules',
  '.git',
  '.next',
  '.medusa',
  'dist',
  'build',
  'coverage',
  'test-results',
  'playwright-report',
])
const skipFile = /(?:\.test\.|\.spec\.|\.stories\.|\.d\.ts$|dev-fixture\.ts$)/
const sourceExt = new Set(['.ts', '.tsx', '.js', '.jsx'])

const englishHint = /\b(the|and|or|to|for|with|your|you|this|that|from|account|order|license|download|support|payment|password|email|checkout|receipt|refund|privacy|terms|roadmap|error|failed|success|welcome|thanks|try|enter|sign|create|reset|continue|expires|expiry|activations|used|free|pro|plugin|store|customer|billing|address|city|country|state|phone|total|subtotal|discount|tax|item|qty|price|shipped|cancelled|canceled|notification|subject|admin|invite|machine|offline|sync|hardware|products|sales|cart|please|missing|invalid|unable|loading|processing|complete|completed|available|unavailable|built|sell|sale|demo|documentation|community|profile|name|first|last|street|zip|postal|region|company|vat)\b/i

const commonShort = new Set([
  'email',
  'password',
  'support',
  'downloads',
  'download',
  'roadmap',
  'privacy',
  'terms',
  'refunds',
  'checkout',
  'pro',
  'free',
  'total',
  'subtotal',
  'discount',
  'tax',
  'item',
  'qty',
  'price',
  'status',
  'active',
  'expired',
  'suspended',
  'avatar',
  'account',
  'profile',
  'orders',
  'licenses',
  'billing',
  'city',
  'country',
  'phone',
  'name',
  'loading',
  'error',
  'success',
  'cancel',
  'continue',
  'sign in',
  'sign up',
  'register',
  'reset',
  'google',
  'github',
  'discord',
  'paypal',
  'bitcoin',
  'card',
  'cash',
  'shipped',
  'planned',
  'done',
  'first name',
  'last name',
  'company',
  'address',
  'country',
  'postcode',
  'zip',
  'vat',
  'abn',
])

const skipAttr = new Set([
  'className',
  'id',
  'href',
  'src',
  'width',
  'height',
  'viewBox',
  'd',
  'fill',
  'stroke',
  'rel',
  'target',
  'type',
  'name',
  'value',
  'key',
  'role',
  'method',
  'action',
  'data-testid',
  'data-state',
  'data-slot',
  'data-step-state',
  'autoComplete',
  'variant',
  'size',
  'color',
  'weight',
  'align',
  'side',
  'as',
  'htmlFor',
  'kind',
  'tool',
  'market',
  'currency',
  'locale',
  'path',
  'url',
])
const interestingAttr = new Set(['title', 'description', 'aria-label', 'alt', 'placeholder', 'label', 'subject'])

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (skipDir.has(entry)) continue
    const filePath = path.join(dir, entry)
    const stat = statSync(filePath)
    if (stat.isDirectory()) {
      walk(filePath, out)
    } else if (sourceExt.has(path.extname(filePath)) && !skipFile.test(filePath)) {
      out.push(filePath)
    }
  }
  return out
}

function looksCodeOrConfig(value: string): boolean {
  const text = value.trim()
  if (!text) return true
  if (/^https?:\/\//.test(text) || /^mailto:/.test(text) || /^#/.test(text)) return true
  if (/^[A-Z0-9_]+$/.test(text) && text.length > 2) return true
  if (/^[a-z0-9_./:@-]+$/.test(text) && !commonShort.has(text.toLowerCase())) return true
  if (/^[\w-]+\.[\w.-]+/.test(text)) return true
  if (/^(GET|POST|PUT|PATCH|DELETE|Content-Type|application\/json|Bearer|Authorization)$/.test(text)) {
    return true
  }
  if (/^[a-z]+-[a-z0-9-]+(\s+[a-z0-9:/.[\]()%#-]+)+$/.test(text)) return true
  if (/^[-\w:.[\]/%#()]+$/.test(text) && !commonShort.has(text.toLowerCase())) return true
  return false
}

function candidate(value: string): string | null {
  const text = value.replace(/\s+/g, ' ').trim()
  if (text.length < 3) return null
  if (looksCodeOrConfig(text)) return null
  const lower = text.toLowerCase()
  if (!/[A-Za-z]/.test(text)) return null
  if (commonShort.has(lower) || englishHint.test(text) || /\s/.test(text) || /[.!?—–:]/.test(text)) {
    return text
  }
  return null
}

type AstNode = TSESTree.Node

function loc(node: AstNode): Pick<Hit, 'line' | 'col'> {
  return { line: node.loc.start.line, col: node.loc.start.column + 1 }
}

function isImportExportLiteral(parent: AstNode | null): boolean {
  return Boolean(
    parent &&
      [
        'ExportAllDeclaration',
        'ExportNamedDeclaration',
        'ImportDeclaration',
        'ImportExpression',
        'TSExternalModuleReference',
      ].includes(parent.type)
  )
}

function textForNode(node: AstNode): string {
  if ('name' in node && typeof node.name === 'string') return node.name
  if ('property' in node && node.property && typeof node.property === 'object') return textForNode(node.property as AstNode)
  return ''
}

function isTranslationKeyLiteral(parent: AstNode | null): boolean {
  if (!parent || parent.type !== 'CallExpression') return false
  const expression = textForNode(parent.callee)
  return (
    /^t\w*$/.test(expression) ||
    expression === 'useTranslations' ||
    expression === 'getTranslations'
  )
}

function propName(node: AstNode, parent: AstNode | null): string | null {
  if (parent?.type === 'JSXAttribute' && 'name' in parent.name && typeof parent.name.name === 'string') {
    return parent.name.name
  }
  if (parent?.type === 'Property' && parent.key === node) return '__property_key__'
  if (parent?.type === 'MemberExpression' && parent.property === node) return '__property_access__'
  return null
}

function category(filePath: string, text: string, attr: string | null): string {
  const relative = path.relative(root, filePath)
  if (relative.includes('/sinks/email-sink') || relative.includes('/pdf-receipt')) return 'generated-document'
  if (relative.includes('/admin/')) return 'admin'
  if (relative.startsWith('src/app/')) return 'route/page'
  if (relative.startsWith('src/components/')) return 'component'
  if (/error|failed|invalid|missing|unable|not found|try again|please/i.test(text)) return 'error/status'
  return attr ? 'attribute' : 'code/string'
}

function scanFile(filePath: string): Hit[] {
  const source = readFileSync(filePath, 'utf8')
  const ast = parse(source, {
    comment: false,
    errorOnTypeScriptSyntacticAndSemanticIssues: false,
    filePath,
    jsx: filePath.endsWith('.tsx') || filePath.endsWith('.jsx'),
    loc: true,
    range: true,
    tokens: false,
  })
  const hits: Hit[] = []

  function add(node: AstNode, raw: string, attr: string | null = null) {
    const text = candidate(raw)
    if (!text) return
    hits.push({
      file: path.relative(root, filePath),
      ...loc(node),
      category: category(filePath, text, attr),
      attr,
      text,
    })
  }

  function visit(node: AstNode, parent: AstNode | null = null) {
    if (node.type === 'JSXText') {
      add(node, node.value)
    } else if (node.type === 'Literal' && typeof node.value === 'string') {
      if (isImportExportLiteral(parent)) return
      if (isTranslationKeyLiteral(parent)) return
      const attr = propName(node, parent)
      if (attr === '__property_key__' || attr === '__property_access__') return
      if (attr && skipAttr.has(attr) && !interestingAttr.has(attr)) return
      add(node, node.value, attr)
    } else if (node.type === 'TemplateElement') {
      add(node, node.value.cooked ?? node.value.raw)
    }

    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc' || key === 'range' || key === 'parent') continue
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child === 'object' && 'type' in child) visit(child as AstNode, node)
        }
      } else if (value && typeof value === 'object' && 'type' in value) {
        visit(value as AstNode, node)
      }
    }
  }

  visit(ast)
  return hits
}

function signature(hit: Pick<Hit, 'file' | 'category' | 'attr' | 'text'>): string {
  return [hit.file, hit.category, hit.attr ?? '', hit.text].join('\u001f')
}

function idFor(hit: Pick<Hit, 'file' | 'category' | 'attr' | 'text'>): string {
  return createHash('sha256').update(signature(hit)).digest('hex').slice(0, 16)
}

function summarize(hits: Hit[]): AllowEntry[] {
  const map = new Map<string, AllowEntry>()
  for (const hit of hits) {
    const key = signature(hit)
    const existing = map.get(key)
    if (existing) {
      existing.count += 1
    } else {
      map.set(key, {
        id: idFor(hit),
        file: hit.file,
        category: hit.category,
        attr: hit.attr,
        text: hit.text,
        count: 1,
      })
    }
  }
  return [...map.values()].sort((a, b) => a.file.localeCompare(b.file) || a.text.localeCompare(b.text))
}

function readAllowlist(): Allowlist {
  if (!existsSync(allowlistPath)) {
    throw new Error(`Missing allowlist at ${allowlistPath}. Run pnpm i18n:hardcoded:update first.`)
  }
  return JSON.parse(readFileSync(allowlistPath, 'utf8')) as Allowlist
}

function writeCsv(hits: Hit[]) {
  mkdirSync(path.dirname(reportPath), { recursive: true })
  const rows = ['file,line,col,category,attr,text']
  for (const hit of hits) {
    rows.push(
      [hit.file, hit.line, hit.col, hit.category, hit.attr ?? '', hit.text]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(',')
    )
  }
  writeFileSync(reportPath, `${rows.join('\n')}\n`)
}

const files = scope.flatMap((item) => {
  const absolute = path.join(root, item)
  if (!existsSync(absolute)) return []
  const stat = statSync(absolute)
  return stat.isDirectory() ? walk(absolute) : [absolute]
})
const hits = files.flatMap(scanFile).sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
const entries = summarize(hits)

if (update) {
  const allowlist: Allowlist = {
    version: 1,
    generatedBy: 'scripts/i18n/hardcoded-english.ts --update',
    updatedAt: new Date().toISOString(),
    scope,
    entries,
  }
  writeFileSync(allowlistPath, `${JSON.stringify(allowlist, null, 2)}\n`)
  writeCsv(hits)
  console.log(`Updated ${path.relative(root, allowlistPath)} with ${entries.length} signatures (${hits.length} hits).`)
  console.log(`Wrote ${path.relative(root, reportPath)}.`)
  process.exit(0)
}

const allowlist = readAllowlist()
const allowed = new Map(allowlist.entries.map((entry) => [signature(entry), entry]))
const current = new Map(entries.map((entry) => [signature(entry), entry]))
const newEntries = entries.filter((entry) => !allowed.has(signature(entry)))
const increasedEntries = entries.filter((entry) => {
  const existing = allowed.get(signature(entry))
  return existing && entry.count > existing.count
})
const removedEntries = allowlist.entries.filter((entry) => !current.has(signature(entry)))

if (json) {
  console.log(JSON.stringify({ hits, entries, newEntries, increasedEntries, removedEntries }, null, 2))
} else if (csv) {
  writeCsv(hits)
  console.log(`Wrote ${path.relative(root, reportPath)}.`)
} else {
  console.log(
    `Hard-coded English scan: ${hits.length} hits across ${entries.length} signatures. ` +
      `${newEntries.length} new, ${increasedEntries.length} increased, ${removedEntries.length} removed.`
  )
}

if (newEntries.length || increasedEntries.length) {
  console.error('\nNew hard-coded English candidates detected. Move them to messages or update the allowlist only for intentional debt.')
  for (const entry of [...newEntries, ...increasedEntries].slice(0, 25)) {
    const previous = allowed.get(signature(entry))?.count ?? 0
    console.error(`- ${entry.file} [${entry.category}] count ${previous} -> ${entry.count}: ${entry.text}`)
  }
  if (newEntries.length + increasedEntries.length > 25) {
    console.error(`...and ${newEntries.length + increasedEntries.length - 25} more.`)
  }
  process.exit(1)
}
