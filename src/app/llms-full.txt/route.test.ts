import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as getIndex } from '@/app/llms.txt/route'
import { marketingRoutes } from '@/app/sitemap'
import { EXTENSIONS } from '@/lib/extensions-catalog'
import en from '../../../messages/en.json'
import { GET } from './route'

describe('GET /llms-full.txt', () => {
  it('serves text/plain', () => {
    const response = GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toMatch(/^text\/plain; charset=utf-8/)
  })

  it('has one section per /llms.txt page, in the same order', async () => {
    const index = await getIndex().text()
    const pages = index.split('## Pages\n')[1].split('\n## Docs')[0]
    const expected = [...pages.matchAll(/^- \[([^\]]+)\]\(([^)]+)\)/gm)]
      .map((match) => [match[1], match[2]])
    const body = await GET().text()
    const sections = [...body.matchAll(/^## \[([^\]]+)\]\(([^)]+)\)/gm)]
      .map((match) => [match[1], match[2]])

    expect(sections).toEqual(expected)
    expect(sections).toHaveLength(marketingRoutes.length)
  })

  it('renders page copy from en.json', async () => {
    const body = await GET().text()

    expect(body).toContain(en.pro.faq.expiry.answer)
    expect(body).toContain(en.legal.terms.gpl.body)
    expect(body).toContain(en.compare.oliver.faq.offline.answer)
    expect(body).toContain(en.about.founder.intro)
    expect(body).toContain(`- [${EXTENSIONS[0].name}](${EXTENSIONS[0].docsUrl})`)
  })

  it('keeps rich-text inner text from the real copy', async () => {
    expect(en.legal.terms.licenses.items.l1.startsWith('<strong>Yearly license.</strong> A one-time payment')).toBe(true)
    const body = await GET().text()

    expect(body).toContain('- Yearly license. A one-time payment that includes Pro features')
  })

  it('renders comparison table rows with column labels', async () => {
    const body = await GET().text()
    const { glance, freeTier } = en.compare.oliver

    expect(body).toContain(`- ${glance.rows.architecture.label}: ${glance.colWcpos}: ${glance.rows.architecture.wcpos}`)
    expect(body).toContain(`- ${freeTier.rows.devices.label}: ${glance.colWcpos}: ${freeTier.rows.devices.wcpos}`)
  })

  it('joins a punctuated row label with a space', async () => {
    const body = await GET().text()

    expect(body).toContain(`- ${en.legal.privacy.collect.items.c2.label} ${en.legal.privacy.collect.items.c2.body}`)
    expect(body).not.toMatch(/^- [^\n[]*[.?!:]: /m)
  })

  it('leaves no ICU arguments or rich-text tags', async () => {
    const body = await GET().text()

    expect(body).not.toMatch(/\{[a-zA-Z]/)
    expect(body).not.toMatch(/<\/?[a-zA-Z]+>/)
  })

  it('contains no Pro price', async () => {
    const body = await GET().text()
    const pro = body.split(/^## \[/m).find((section) => section.startsWith(`${en.pro.metadata.title}](https://wcpos.com/pro)`))

    expect(pro).toBeDefined()
    expect(pro).not.toMatch(/\$\d/)
  })
})

describe('GET /llms-full.txt sanitization', () => {
  beforeEach(() => {
    vi.resetModules()
    const nested = '<scr<script>ipt>alert(1)</script>'
    const plain = '<script>alert(1)</script>'
    const unclosed = 'a <script b'
    vi.doMock('@/lib/llms-pages', () => ({
      llmsPages: [{ path: '/probe', url: 'https://wcpos.com/probe', title: 'Probe', description: 'Probe page', content: ['probe'] }],
    }))
    vi.doMock('../../../messages/en.json', () => ({ default: { ...en, probe: { nested, plain, unclosed } } }))
  })

  afterEach(() => {
    vi.doUnmock('@/lib/llms-pages')
    vi.doUnmock('../../../messages/en.json')
    vi.resetModules()
  })

  it('removes a nested <scr<script>ipt> tag', async () => {
    const { GET } = await import('./route')
    const body = await GET().text()

    expect(body.split('\n')).toContain('scriptalert(1)')
    expect(body).not.toMatch(/<script/i)
  })

  it('removes a plain <script> tag', async () => {
    const { GET } = await import('./route')
    const body = await GET().text()

    expect(body.split('\n')).toContain('alert(1)')
    expect(body).not.toMatch(/<script/i)
  })

  it('removes an unclosed <script', async () => {
    const { GET } = await import('./route')
    const body = await GET().text()

    expect(body).toContain('a script b')
    expect(body).not.toMatch(/<script/i)
  })

  it('leaves no angle bracket from message copy', async () => {
    const { GET } = await import('./route')
    const body = await GET().text()
    const probe = body.split('## [Probe](https://wcpos.com/probe)')[1]
    const copy = probe.split('\n').filter((line) => line !== '> Probe page').join('\n')

    expect(copy).not.toMatch(/[<>]/)
  })
})
