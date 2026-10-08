// Marketing backlog item 92: rewrite sitemap locs so CI checks the local
// build, never the live site.
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { extractSitemapUrls } from './sitemap-urls.mjs'

export const LOCAL_ORIGIN = 'http://localhost:3000'

export function linkCheckSeeds(xml, origin = LOCAL_ORIGIN) {
  const entries = extractSitemapUrls(xml)
  if (!/<urlset(?:\s|>)/.test(xml) || entries.length === 0) {
    throw new Error('sitemap must contain a urlset with loc entries')
  }
  return [
    { source: '/', url: new URL('/', origin).href },
    ...entries.map((entry) => {
      const loc = new URL(entry)
      return {
        source: 'sitemap',
        url: new URL(loc.pathname + loc.search, origin).href,
      }
    }),
  ]
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [file, origin] = process.argv.slice(2)
  if (!file) {
    console.error('Usage: node scripts/link-check-seeds.mjs <sitemap-file> [origin]')
    process.exit(1)
  }
  try {
    const seeds = linkCheckSeeds(readFileSync(file, 'utf8'), origin)
    for (const { source, url } of seeds) {
      console.error(`seed (${source}): ${url}`)
    }
    console.error(`${seeds.length} link-check seeds`)
    console.log(seeds.map(({ url }) => url).join('\n'))
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
