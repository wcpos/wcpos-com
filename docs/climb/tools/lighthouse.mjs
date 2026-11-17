// Hill-climb Lighthouse pass (mobile + desktop, light scheme) over the key pages.
// Usage: node docs/climb/tools/lighthouse.mjs <outDir> [baseUrl]   (CHROME_PATH must be set)
import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const [outDir, base = 'https://wcpos.com'] = process.argv.slice(2);
const lhRun = join(homedir(), '.claude/lib/site-audit/lh-run.mjs');
const PAGES = ['/', '/pro', '/compare', '/downloads', '/de'];
const cats = ['performance', 'accessibility', 'best-practices', 'seo'];
const out = {};
for (const path of PAGES) {
  for (const form of ['mobile', 'desktop']) {
    const r = spawnSync(process.execPath, [lhRun, base + path, form, 'light'], { encoding: 'utf8', timeout: 180000, maxBuffer: 200 * 1024 * 1024 });
    if (r.status !== 0) { out[`${path} ${form}`] = { error: (r.stderr || '').trim().slice(0, 300) }; continue; }
    const lhr = JSON.parse(r.stdout);
    const scores = Object.fromEntries(cats.map(c => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)]));
    const metrics = Object.fromEntries(['largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'first-contentful-paint']
      .map(id => [id, lhr.audits[id]?.displayValue]));
    const failing = Object.values(lhr.audits).filter(a => typeof a.score === 'number' && a.score < 0.9 && a.scoreDisplayMode !== 'informative')
      .sort((a, b) => a.score - b.score).slice(0, 6).map(a => `${a.id} (${a.score})${a.displayValue ? ' ' + a.displayValue : ''}`);
    out[`${path} ${form}`] = { ...scores, ...metrics, failing };
    console.log(path, form, JSON.stringify(scores));
  }
}
await writeFile(join(outDir, 'lighthouse.json'), JSON.stringify(out, null, 2));
