import { EXTENSIONS } from '@/lib/extensions-catalog'
import { llmsPages } from '@/lib/llms-pages'
import en from '../../../messages/en.json'

const skippedKeys = /^(meta|metadata|eyebrow|cta|actions|badge|diagram|visuals)$|Cta$|[Aa]ria|Link$|LinkLabel$|Prefix$|Suffix$|^col[A-Z]/
const headingKeys = ['title', 'heading', 'headline', 'question', 'claim']

function clean(text: string): string {
  let stripped = text
  let previous: string
  do {
    previous = stripped
    stripped = stripped.replace(/<\/?[a-zA-Z]+>/g, '')
  } while (stripped !== previous)
  const cleaned = stripped.replace(/[<>]/g, '')
  return /\{[a-zA-Z]/.test(cleaned) ? '' : cleaned
}

function collectColumns(value: unknown, columns: Record<string, string>): void {
  if (!value || typeof value !== 'object') return
  for (const [key, entry] of Object.entries(value)) {
    if (/^col[A-Z]/.test(key) && typeof entry === 'string' && !(key in columns)) {
      columns[key] = clean(entry)
    }
    collectColumns(entry, columns)
  }
}

function render(value: unknown, key: string, level: number, columns: Record<string, string>): string[] {
  if (typeof value === 'string') return clean(value) ? [clean(value)] : []
  if (!value || typeof value !== 'object') return []
  const entries = Object.entries(value)
    .filter(([key]) => !skippedKeys.test(key))
    .map(([key, entry]) => [key, typeof entry === 'string' ? clean(entry) : entry] as const)
    .filter(([, entry]) => entry !== '')
  const heading = headingKeys.map((key) => entries.find(([name, entry]) => name === key && typeof entry === 'string'))
    .find((entry) => entry !== undefined)
  const label = entries.find(([key, entry]) => key === 'label' && typeof entry === 'string')
  if (!heading && 'label' in value && typeof value.label === 'string') {
    if (!label) return []
    const values = entries.filter(([key, entry]) => key !== 'label' && typeof entry === 'string')
      .map(([key, entry]) => {
        const column = columns[`col${key[0].toUpperCase()}${key.slice(1)}`]
        return column ? `${column}: ${entry}` : entry
      })
    const separator = /[.:?!]$/.test(String(label[1])) ? ' ' : ': '
    return [`- ${label[1]}${separator}${values.join('; ')}`]
  }
  if (!heading && /^(items|features|examples|chips)$/.test(key) && entries.every(([, entry]) => typeof entry === 'string')) {
    return entries.map(([, entry]) => `- ${entry}`)
  }
  const blocks = heading ? [`${'#'.repeat(Math.min(level, 6))} ${heading[1]}`] : []
  for (const [key, entry] of entries) {
    if (key !== heading?.[0]) blocks.push(...render(entry, key, heading ? level + 1 : level, columns))
  }
  return blocks
}

// llms-full.txt (llmstxt.org) English public page copy, built from the shared page list and committed messages and extensions.
export function GET(): Response {
  const blocks = ['# WCPOS', `> ${en.home.meta.description}`]
  for (const page of llmsPages) {
    blocks.push(`## [${page.title}](${page.url})`, `> ${page.description}`)
    for (const key of page.content) {
      const parts = key.split('.')
      const value = parts.reduce<unknown>(
        (value, part) => (value as Record<string, unknown>)?.[part], en,
      )
      if (value === undefined) throw new Error(`Missing message key: ${key}`)
      const columns: Record<string, string> = {}
      collectColumns(value, columns)
      blocks.push(...render(value, parts[parts.length - 1], 3, columns))
    }
    if (page.path === '/extensions') {
      blocks.push(...EXTENSIONS.map((extension) =>
        `- [${extension.name}](${extension.docsUrl}): ${extension.description}${extension.requiresPro ? ` (${en.extensions.proTag})` : ''}`,
      ))
    }
  }
  const body = blocks.map((block, index) => {
    const separator = index === 0 ? '' : block.startsWith('- ') && blocks[index - 1].startsWith('- ') ? '\n' : '\n\n'
    return separator + block
  }).join('') + '\n'

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
