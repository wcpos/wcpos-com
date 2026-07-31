#!/usr/bin/env node
// IndexNow ping — notifies Bing (and every IndexNow-participating engine) that
// our pages changed, so the Bing index ChatGPT/Copilot lean on stays fresh.
// Google does not support IndexNow; it is covered by the ordinary sitemap.
//
//   node scripts/indexnow-ping.mjs             # submits every sitemap URL
//   pnpm seo:indexnow
//
// Run after a production deploy that changes public pages. Safe to re-run:
// IndexNow treats repeat submissions as no-ops. (wcpos/wcpos-com#594)

const HOST = 'wcpos.com'
// The key is deliberately public — IndexNow verifies ownership by serving it
// at https://<host>/<key>.txt (see public/<key>.txt).
const KEY = 'e23d261eb88a31b4dc3073181409a657'
const SITEMAP = `https://${HOST}/sitemap.xml`

const res = await fetch(SITEMAP)
if (!res.ok) {
  console.error(`Failed to fetch ${SITEMAP}: ${res.status}`)
  process.exit(1)
}
const xml = await res.text()
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
if (urlList.length === 0) {
  console.error('Sitemap contained no <loc> entries — refusing to ping')
  process.exit(1)
}

const ping = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList,
  }),
})

// 200 = accepted, 202 = accepted pending key validation.
if (ping.status === 200 || ping.status === 202) {
  console.log(`IndexNow accepted ${urlList.length} URLs (HTTP ${ping.status})`)
} else {
  console.error(`IndexNow rejected the ping: HTTP ${ping.status}`)
  process.exit(1)
}
