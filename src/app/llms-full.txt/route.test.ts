import { describe, expect, it } from 'vitest'
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

  it('renders comparison table rows with column labels', async () => {
    const body = await GET().text()
    const { glance, freeTier } = en.compare.oliver

    expect(body).toContain(`- ${glance.rows.architecture.label}: ${glance.colWcpos}: ${glance.rows.architecture.wcpos}`)
    expect(body).toContain(`- ${freeTier.rows.devices.label}: ${glance.colWcpos}: ${freeTier.rows.devices.wcpos}`)
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
