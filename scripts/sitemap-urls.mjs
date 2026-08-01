// Sitemap <loc> extraction shared by scripts/indexnow-ping.mjs.
// Sitemap XML must escape `&` as `&amp;` (sitemaps.org protocol), so values
// are decoded before being submitted anywhere outside an XML context.

const XML_NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
}

export const decodeXmlEntities = (value) =>
  value.replace(
    /&(?:#x([0-9a-fA-F]+)|#([0-9]+)|(amp|lt|gt|quot|apos));/g,
    (_, hex, dec, named) =>
      named
        ? XML_NAMED_ENTITIES[named]
        : String.fromCodePoint(parseInt(hex ?? dec, hex ? 16 : 10)),
  )

export const extractSitemapUrls = (xml) =>
  [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    decodeXmlEntities(m[1].trim()),
  )
