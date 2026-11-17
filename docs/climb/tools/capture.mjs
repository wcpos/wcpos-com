// Hill-climb capture: desktop + phone screenshots and on-page SEO facts of the live site.
// Usage: node docs/climb/tools/capture.mjs <outDir> [baseUrl]
// Needs puppeteer-core from ~/.claude/lib/site-audit and CHROME_PATH (Playwright's Chromium).
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(join(homedir(), '.claude/lib/site-audit/package.json'));
const puppeteer = require('puppeteer-core');

const [outDir, base = 'https://wcpos.com'] = process.argv.slice(2);
if (!outDir) { console.error('usage: capture.mjs <outDir> [baseUrl]'); process.exit(2); }

// Pages the judges score. nl/de cover the long-word squeeze.
const PAGES = [
  ['home', '/'], ['pro', '/pro'], ['compare', '/compare'], ['compare-square', '/compare/square'],
  ['downloads', '/downloads'], ['extensions', '/extensions'], ['support', '/support'],
  ['nl-home', '/nl'], ['nl-pro', '/nl/pro'], ['de-home', '/de'], ['de-pro', '/de/pro'],
];
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } };

await mkdir(join(outDir, 'shots'), { recursive: true });
await mkdir(join(outDir, 'text'), { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: true, args: ['--no-sandbox'] });
const facts = {};
try {
  for (const [name, path] of PAGES) {
    for (const [vp, viewport] of Object.entries(VIEWPORTS)) {
      const page = await browser.newPage();
      await page.setViewport(viewport);
      const t0 = Date.now();
      const res = await page.goto(base + path, { waitUntil: 'networkidle2', timeout: 60000 });
      const loadMs = Date.now() - t0;
      // Scroll through so reveal-on-scroll content renders, then back to top.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
        window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 400));
      });
      await page.screenshot({ path: join(outDir, 'shots', `${name}-${vp}-fold.jpg`), type: 'jpeg', quality: 60 });
      await page.screenshot({ path: join(outDir, 'shots', `${name}-${vp}-full.jpg`), type: 'jpeg', quality: 50, fullPage: true });
      const info = await page.evaluate(() => {
        const meta = n => document.querySelector(`meta[name="${n}"],meta[property="${n}"]`)?.content ?? null;
        const overflow = [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > window.innerWidth + 1)
          .slice(0, 5).map(el => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);
        return {
          title: document.title, description: meta('description'),
          canonical: document.querySelector('link[rel=canonical]')?.href ?? null,
          hreflang: document.querySelectorAll('link[rel=alternate][hreflang]').length,
          ogImage: meta('og:image'), robots: meta('robots'),
          h1: [...document.querySelectorAll('h1')].map(h => h.innerText.trim()),
          h2: [...document.querySelectorAll('h2')].map(h => h.innerText.trim()).slice(0, 20),
          jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { const j = JSON.parse(s.textContent); return [].concat(j['@graph'] ?? j).map(x => x['@type']); } catch { return 'invalid'; } }).flat(),
          internalLinks: new Set([...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => h.startsWith(location.origin))).size,
          imgsNoAlt: [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length,
          scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, overflow,
          foldText: document.body.innerText.slice(0, 600),
        };
      });
      if (vp === 'desktop') await writeFile(join(outDir, 'text', `${name}.txt`), await page.evaluate(() => document.body.innerText));
      facts[`${name}-${vp}`] = { url: base + path, status: res?.status(), loadMs, ...info };
      await page.close();
      console.log(name, vp, res?.status(), `${loadMs}ms`);
    }
  }
} finally {
  await browser.close();
}
await writeFile(join(outDir, 'facts.json'), JSON.stringify(facts, null, 2));
