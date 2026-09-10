// Run after: CI=true PORT=3111 node_modules/.bin/next dev -p 3111
import { chromium } from '@playwright/test'
import { mkdir, stat } from 'node:fs/promises'

if (process.env.NODE_ENV === 'production') process.exit(0)
const base = 'http://localhost:3111/roadmap'
const output = '.claude/prototypes/2026-09-11-roadmap-release-brief'
const viewports = { desktop: { width: 1280, height: 1000 }, mobile: { width: 400, height: 900 } }
const response = await fetch(base)
if (response.status !== 200) throw new Error(`Roadmap returned ${response.status}; start the dev server first`)
await mkdir(output, { recursive: true })
const browser = await chromium.launch()
for (const variant of ['A', 'B', 'C']) {
  for (const [viewport, size] of Object.entries(viewports)) {
    for (const scheme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: size })
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
      // Root layout uses next-themes: attribute="class", default storage key "theme".
      await page.addInitScript(theme => localStorage.setItem('theme', theme), scheme)
      const fixtures = variant === 'A' && viewport === 'desktop' && scheme === 'light' ? ['', '&fixture=empty'] : ['']
      for (const fixture of fixtures) {
        await page.goto(`${base}?variant=${variant}${fixture}`, { waitUntil: 'networkidle' })
        await page.locator(`[data-prototype="${variant}"]`).waitFor()
        await page.locator('[data-prototype-switcher]').waitFor()
        await page.waitForFunction(theme => document.documentElement.classList.contains(theme), scheme)
        await page.evaluate(() => document.fonts.ready)
        const path = `${output}/${variant}-${viewport}-${scheme}${fixture ? '-empty' : ''}.png`
        await page.screenshot({ path, fullPage: true, animations: 'disabled' })
        console.log(`${path}\t${(await stat(path)).size} bytes`)
      }
      await page.close()
    }
  }
}
await browser.close()
