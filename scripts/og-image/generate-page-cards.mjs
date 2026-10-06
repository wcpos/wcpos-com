import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const cards = [
  {
    slug: 'pro',
    title: 'WCPOS Pro',
    line: 'Terminal payments, stock editing, reports and priority support.',
  },
  {
    slug: 'downloads',
    title: 'Download WCPOS',
    line: 'The free plugin plus desktop, iOS, Android and web apps.',
  },
  {
    slug: 'support',
    title: 'WCPOS Support',
    line: 'Instant answers from the docs, or chat with the community on Discord.',
  },
  {
    slug: 'roadmap',
    title: 'WCPOS Roadmap',
    line: "What we're building next, release by release.",
  },
  {
    slug: 'about-us',
    title: 'About WCPOS',
    line: 'An independent point of sale, built by a former shopkeeper.',
  },
  {
    slug: 'compare',
    title: 'Compare WooCommerce POS systems',
    line: 'Honest, sourced comparisons: architecture, pricing and offline support.',
  },
  {
    slug: 'compare-oliver-pos',
    title: 'WCPOS vs Oliver POS',
    line: 'Free-tier limits, pricing, terminals and offline support, compared.',
  },
]

const outputDirectory = new URL('../../public/og/', import.meta.url)
await mkdir(outputDirectory, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
for (const { slug, title, line } of cards) {
  const url = new URL('./page-card.html', import.meta.url)
  url.search = new URLSearchParams({ title, line }).toString()
  await page.goto(url.href)
  await page.screenshot({
    path: fileURLToPath(new URL(`${slug}.png`, outputDirectory)),
  })
  console.log(`public/og/${slug}.png`)
}
await browser.close()
